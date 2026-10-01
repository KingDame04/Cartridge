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

describe('User game entry routes', () => {
    it('rejects requests with no auth token', async () => {
        const res = await request(app).get('/api/user-game-entries/collection');
        expect(res.statusCode).toBe(401);
    });

    describe('POST /api/user-game-entries', () => {
        it('rejects a malformed game ID', async () => {
            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: 'not-a-valid-id' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects listIds that are not an array', async () => {
            const game = await Game.create({ name: 'Listless', source: 'manual' });

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: game._id.toString(), listIds: 'nope' });

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for a game that does not exist', async () => {
            const fakeGameId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: fakeGameId.toString() });

            expect(res.statusCode).toBe(404);
        });

        it('returns 404 when a listId does not belong to the requesting user', async () => {
            const game = await Game.create({ name: 'Foreign List Game', source: 'manual' });
            const foreignList = await List.create({ userId: userB._id, name: 'Not Yours' });

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: game._id.toString(), listIds: [foreignList._id.toString()] });

            expect(res.statusCode).toBe(404);
        });

        it('creates an entry and populates the game', async () => {
            const game = await Game.create({ name: 'Freshly Played', source: 'manual' });

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: game._id.toString(), played: true, rating: 4 });

            expect(res.statusCode).toBe(201);
            expect(res.body.entry.gameId.name).toBe('Freshly Played');
            expect(res.body.entry.rating).toBe(4);
        });

        it('rejects a duplicate entry for the same game', async () => {
            const game = await Game.create({ name: 'Already Owned', source: 'manual' });
            await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: game._id.toString() });

            expect(res.statusCode).toBe(409);
            expect(res.body.entryId).toBeDefined();
        });

        it('rejects an out-of-range rating (schema validation)', async () => {
            const game = await Game.create({ name: 'Bad Rating Game', source: 'manual' });

            const res = await request(app)
                .post('/api/user-game-entries')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ gameId: game._id.toString(), rating: 99 });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/user-game-entries/collection', () => {
        it('only returns the requesting user\'s own entries', async () => {
            const game = await Game.create({ name: 'UserB Game', source: 'manual' });
            await GameUserEntry.create({ userId: userB._id, gameId: game._id });

            const res = await request(app)
                .get('/api/user-game-entries/collection')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every((entry) => entry.gameId?.name !== 'UserB Game')).toBe(true);
        });

        describe('pagination (page/limit query params)', () => {
            // A dedicated user for this describe block, so its entry count
            // isn't affected by other tests creating entries for userA/userB.
            let pagingUser, pagingToken;

            beforeAll(async () => {
                ({ user: pagingUser, token: pagingToken } = await createVerifiedUser());

                const gameDefs = [
                    { name: 'Alpha Quest', developers: ['Nintendo'], genres: ['RPG'], releaseDate: new Date('2010-01-01') },
                    { name: 'Beta Raiders', developers: ['Valve'], genres: ['Action'], releaseDate: new Date('2015-01-01') },
                    { name: 'Gamma Storm', developers: ['Nintendo'], genres: ['Action', 'RPG'], releaseDate: new Date('2020-01-01') },
                    { name: 'Delta Force', developers: ['Sega'], genres: ['Shooter'], releaseDate: new Date('2005-01-01') },
                    { name: 'Epsilon Rally', developers: ['Sega'], genres: ['Racing'], releaseDate: new Date('2018-01-01') }
                ];

                for (const def of gameDefs) {
                    const game = await Game.create({ ...def, source: 'manual' });
                    await GameUserEntry.create({
                        userId: pagingUser._id,
                        gameId: game._id,
                        played: def.name === 'Alpha Quest' || def.name === 'Gamma Storm',
                        rating: def.name === 'Alpha Quest' ? 5 : undefined,
                        platformPlayed: def.name === 'Beta Raiders' ? 'PC' : undefined
                    });
                }
            });

            it('returns only a page worth of entries, with count metadata, when page/limit are given', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 2 })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.statusCode).toBe(200);
                expect(res.body.entries).toHaveLength(2);
                expect(res.body.page).toBe(1);
                expect(res.body.pageSize).toBe(2);
                expect(res.body.totalCount).toBe(5);
                expect(res.body.totalPages).toBe(3);
            });

            it('returns a different slice on page 2, with no overlap with page 1', async () => {
                const page1 = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 2 })
                    .set('Authorization', `Bearer ${pagingToken}`);
                const page2 = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 2, limit: 2 })
                    .set('Authorization', `Bearer ${pagingToken}`);

                const page1Ids = page1.body.entries.map((e) => e._id);
                const page2Ids = page2.body.entries.map((e) => e._id);

                expect(page2.body.entries).toHaveLength(2);
                expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
            });

            it('includes filterOptions listing every developer/genre in the whole collection', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 2 })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.filterOptions.developers.sort()).toEqual(['Nintendo', 'Sega', 'Valve']);
                expect(res.body.filterOptions.genres.sort()).toEqual(['Action', 'RPG', 'Racing', 'Shooter']);
            });

            it('filters by search term across game name', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, search: 'raiders' })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.totalCount).toBe(1);
                expect(res.body.entries[0].gameId.name).toBe('Beta Raiders');
            });

            it('filters by played status', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, played: 'true' })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.entries.every((e) => e.played)).toBe(true);
            });

            it('filters by developer', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, developers: 'Sega' })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.entries.every((e) => e.gameId.developers.includes('Sega'))).toBe(true);
            });

            it('filters by genre', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, genres: 'RPG' })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.entries.every((e) => e.gameId.genres.includes('RPG'))).toBe(true);
            });

            it('filters by release year range', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, yearMin: 2016, yearMax: 2019 })
                    .set('Authorization', `Bearer ${pagingToken}`);

                expect(res.body.totalCount).toBe(1);
                expect(res.body.entries[0].gameId.name).toBe('Epsilon Rally');
            });

            it('sorts by title A-Z', async () => {
                const res = await request(app)
                    .get('/api/user-game-entries/collection')
                    .query({ page: 1, limit: 20, sort: 'title_asc' })
                    .set('Authorization', `Bearer ${pagingToken}`);

                const names = res.body.entries.map((e) => e.gameId.name);
                expect(names).toEqual([...names].sort());
            });
        });
    });

    describe('GET /api/user-game-entries/collection/:entryId', () => {
        it('rejects a malformed entry ID', async () => {
            const res = await request(app)
                .get('/api/user-game-entries/collection/not-a-valid-id')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for an entry owned by another user', async () => {
            const game = await Game.create({ name: 'Not Yours To View', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userB._id, gameId: game._id });

            const res = await request(app)
                .get(`/api/user-game-entries/collection/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('returns the entry when it belongs to the requesting user', async () => {
            const game = await Game.create({ name: 'Viewable Game', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .get(`/api/user-game-entries/collection/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.gameId.name).toBe('Viewable Game');
        });
    });

    describe('PATCH /api/user-game-entries/collection/:entryId', () => {
        it('rejects a request with no valid fields', async () => {
            const game = await Game.create({ name: 'Unpatchable', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .patch(`/api/user-game-entries/collection/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ notARealField: 'ignored' });

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for an entry owned by another user', async () => {
            const game = await Game.create({ name: 'Not Yours To Patch', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userB._id, gameId: game._id });

            const res = await request(app)
                .patch(`/api/user-game-entries/collection/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ hoursPlayed: 5 });

            expect(res.statusCode).toBe(404);
        });

        it('updates allowed fields on the requesting user\'s entry', async () => {
            const game = await Game.create({ name: 'Patchable', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .patch(`/api/user-game-entries/collection/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ hoursPlayed: 12, played: true, rating: 5 });

            expect(res.statusCode).toBe(200);
            expect(res.body.entry.hoursPlayed).toBe(12);
            expect(res.body.entry.rating).toBe(5);
        });
    });

    describe('DELETE /api/user-game-entries/:entryId', () => {
        it('rejects a malformed entry ID', async () => {
            const res = await request(app)
                .delete('/api/user-game-entries/not-a-valid-id')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(400);
        });

        it('returns 404 for an entry owned by another user', async () => {
            const game = await Game.create({ name: 'Not Yours To Delete', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userB._id, gameId: game._id });

            const res = await request(app)
                .delete(`/api/user-game-entries/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('deletes the requesting user\'s own entry', async () => {
            const game = await Game.create({ name: 'Deletable Entry', source: 'manual' });
            const entry = await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .delete(`/api/user-game-entries/${entry._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);

            const deletedEntry = await GameUserEntry.findById(entry._id);
            expect(deletedEntry).toBeNull();
        });
    });

    describe('POST /api/user-game-entries/lists/:listId/games/:gameId', () => {
        it('returns 404 when the list does not belong to the requesting user', async () => {
            const game = await Game.create({ name: 'Addable Game', source: 'manual' });
            const foreignList = await List.create({ userId: userB._id, name: 'Foreign List' });

            const res = await request(app)
                .post(`/api/user-game-entries/lists/${foreignList._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('returns 404 when the game does not exist', async () => {
            const list = await List.create({ userId: userA._id, name: 'Real List' });
            const fakeGameId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post(`/api/user-game-entries/lists/${list._id}/games/${fakeGameId}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('creates a new entry (upsert) and adds the list when none existed yet', async () => {
            const list = await List.create({ userId: userA._id, name: 'Upsert List' });
            const game = await Game.create({ name: 'Upsert Game', source: 'manual' });

            const res = await request(app)
                .post(`/api/user-game-entries/lists/${list._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.entry.listIds.map(String)).toContain(list._id.toString());
        });

        it('adds the list to an existing entry without duplicating it', async () => {
            const list = await List.create({ userId: userA._id, name: 'Existing Entry List' });
            const game = await Game.create({ name: 'Existing Entry Game', source: 'manual' });
            await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            await request(app)
                .post(`/api/user-game-entries/lists/${list._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);
            const res = await request(app)
                .post(`/api/user-game-entries/lists/${list._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            const listIdCount = res.body.entry.listIds.filter(
                (id) => String(id) === list._id.toString()
            ).length;
            expect(listIdCount).toBe(1);
        });
    });

    describe('DELETE /api/user-game-entries/lists/:listId/games/:gameId', () => {
        it('returns 404 when the entry is not in that list', async () => {
            const list = await List.create({ userId: userA._id, name: 'Empty List' });
            const game = await Game.create({ name: 'Not In List', source: 'manual' });
            await GameUserEntry.create({ userId: userA._id, gameId: game._id });

            const res = await request(app)
                .delete(`/api/user-game-entries/lists/${list._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(404);
        });

        it('removes the list from the entry', async () => {
            const list = await List.create({ userId: userA._id, name: 'Removable List' });
            const game = await Game.create({ name: 'In A Removable List', source: 'manual' });
            await GameUserEntry.create({ userId: userA._id, gameId: game._id, listIds: [list._id] });

            const res = await request(app)
                .delete(`/api/user-game-entries/lists/${list._id}/games/${game._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.entry.listIds.map(String)).not.toContain(list._id.toString());
        });
    });
});
