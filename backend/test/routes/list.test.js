const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/users');
const List = require('../../src/models/list');
const Game = require('../../src/models/games');
const GameUserEntry = require('../../src/models/gameUserEntry');
const { createVerifiedUser } = require('../testUtils/authHelper');

let userA, tokenA, userB, tokenB;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    ({ user: userA, token: tokenA } = await createVerifiedUser());
    ({ user: userB, token: tokenB } = await createVerifiedUser());
});

afterAll(async () => {
    await List.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await GameUserEntry.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await mongoose.connection.close();
});

describe('List routes', () => {
    it('rejects requests with no auth token', async () => {
        const res = await request(app).get('/api/lists');
        expect(res.statusCode).toBe(401);
    });

    describe('POST /api/lists', () => {
        it('rejects a blank name', async () => {
            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: '   ' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects entryIds that are not an array', async () => {
            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Backlog', entryIds: 'not-an-array' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects a malformed entry ID', async () => {
            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Backlog', entryIds: ['not-a-valid-object-id'] });

            expect(res.statusCode).toBe(400);
        });

        it('rejects an entry ID that does not belong to the requesting user', async () => {
            const game = await Game.create({ name: 'Some Game', source: 'manual' });
            const otherEntry = await GameUserEntry.create({ userId: userB._id, gameId: game._id });

            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Backlog', entryIds: [otherEntry._id.toString()] });

            expect(res.statusCode).toBe(404);
        });

        it('creates a list with no entries', async () => {
            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Favorites' });

            expect(res.statusCode).toBe(201);
            expect(res.body.list.name).toBe('Favorites');
            expect(res.body.assignedEntryIds).toEqual([]);
        });

        it('creates a list and attaches the given entries, deduplicating repeats', async () => {
            const game = await Game.create({ name: 'Attach Me', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .post('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'With Entries', entryIds: [entry._id.toString(), entry._id.toString()] });

            expect(res.statusCode).toBe(201);
            expect(res.body.assignedEntryIds).toEqual([entry._id.toString()]);

            const updatedEntry = await GameUserEntry.findById(entry._id);
            expect(updatedEntry.listIds.map(String)).toContain(res.body.list._id.toString());
        });
    });

    describe('GET /api/lists', () => {
        it('only returns the requesting user\'s own lists', async () => {
            await List.create({ userId: userB._id, name: 'UserB Only List' });

            const res = await request(app)
                .get('/api/lists')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.every((list) => list.name !== 'UserB Only List')).toBe(true);
        });
    });

    describe('PATCH /api/lists/:listId', () => {
        it('rejects a malformed list ID', async () => {
            const res = await request(app)
                .patch('/api/lists/not-a-valid-id')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'New Name' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects an update with no fields', async () => {
            const list = await List.create({ userId: userA._id, name: 'To Update' });

            const res = await request(app)
                .patch(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({});

            expect(res.statusCode).toBe(400);
        });

        it('rejects a blank name', async () => {
            const list = await List.create({ userId: userA._id, name: 'To Update' });

            const res = await request(app)
                .patch(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: '   ' });

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for a list owned by another user', async () => {
            const list = await List.create({ userId: userB._id, name: 'Not Yours' });

            const res = await request(app)
                .patch(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Hijacked' });

            expect(res.statusCode).toBe(404);
        });

        it('renames a list and clears its cover image', async () => {
            const list = await List.create({ userId: userA._id, name: 'Old Name', coverImage: 'old.png' });

            const res = await request(app)
                .patch(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'New Name', coverImage: null });

            expect(res.statusCode).toBe(200);
            expect(res.body.list.name).toBe('New Name');
            expect(res.body.list.coverImage).toBeNull();
        });
    });

    describe('DELETE /api/lists/:listId', () => {
        it('rejects a malformed list ID', async () => {
            const res = await request(app)
                .delete('/api/lists/not-a-valid-id')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for a list owned by another user', async () => {
            const list = await List.create({ userId: userB._id, name: 'Not Yours To Delete' });

            const res = await request(app)
                .delete(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('deletes the list and pulls it off any entries referencing it', async () => {
            const list = await List.create({ userId: userA._id, name: 'Deletable' });
            const game = await Game.create({ name: 'In A List', source: 'manual' });
            const entry = await GameUserEntry.create({
                userId: userA._id,
                gameId: game._id,
                listIds: [list._id]
            });

            const res = await request(app)
                .delete(`/api/lists/${list._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);

            const deletedList = await List.findById(list._id);
            expect(deletedList).toBeNull();

            const updatedEntry = await GameUserEntry.findById(entry._id);
            expect(updatedEntry.listIds.map(String)).not.toContain(list._id.toString());
        });
    });
});
