jest.mock('../../src/services/rawgService', () => ({
    searchRawgGames: jest.fn(),
    getRawgGame: jest.fn()
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/users');
const Game = require('../../src/models/games');
const { searchRawgGames, getRawgGame } = require('../../src/services/rawgService');
const { createVerifiedUser } = require('../testUtils/authHelper');

let userA, tokenA;

const rawgGameFixture = (overrides = {}) => ({
    id: 1234,
    name: 'Fixture Quest',
    background_image: 'https://images/fixture.png',
    genres: [{ name: 'Adventure' }],
    platforms: [{ platform: { name: 'PC' } }],
    developers: [{ name: 'Fixture Studios' }],
    released: '2020-01-01',
    description_raw: 'A fixture for testing.',
    ...overrides
});

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    ({ user: userA, token: tokenA } = await createVerifiedUser());
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(async () => {
    await Game.deleteMany({ rawgId: { $in: [1234, 5678] } });
    await Game.deleteMany({ name: { $regex: /^Manual Test Game/ } });
    await User.deleteMany({ _id: userA._id });
    await mongoose.connection.close();
});

describe('Game routes', () => {
    describe('GET /api/games/search', () => {
        it('rejects a missing search term', async () => {
            const res = await request(app).get('/api/games/search');
            expect(res.statusCode).toBe(400);
            expect(searchRawgGames).not.toHaveBeenCalled();
        });

        it('formats and returns RAWG search results', async () => {
            searchRawgGames.mockResolvedValueOnce({
                count: 1,
                next: null,
                previous: null,
                results: [rawgGameFixture()]
            });

            const res = await request(app).get('/api/games/search').query({ search: 'fixture' });

            expect(res.statusCode).toBe(200);
            expect(searchRawgGames).toHaveBeenCalledWith('fixture', 1, 20);
            expect(res.body.results[0]).toMatchObject({
                rawgId: 1234,
                name: 'Fixture Quest',
                coverImage: 'https://images/fixture.png',
                genres: ['Adventure'],
                platforms: ['PC'],
                developers: ['Fixture Studios']
            });
        });

        it('passes through page and pageSize query params', async () => {
            searchRawgGames.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });

            await request(app).get('/api/games/search').query({ search: 'fixture', page: 3, pageSize: 5 });

            expect(searchRawgGames).toHaveBeenCalledWith('fixture', 3, 5);
        });

        it('returns 500 when the RAWG service throws', async () => {
            searchRawgGames.mockRejectedValueOnce(new Error('RAWG is down'));

            const res = await request(app).get('/api/games/search').query({ search: 'fixture' });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /api/games/rawg/:rawgId', () => {
        it('rejects a non-numeric rawgId', async () => {
            const res = await request(app).get('/api/games/rawg/not-a-number');
            expect(res.statusCode).toBe(400);
        });

        it('rejects a non-positive rawgId', async () => {
            const res = await request(app).get('/api/games/rawg/0');
            expect(res.statusCode).toBe(400);
        });

        it('formats and returns a single RAWG game', async () => {
            getRawgGame.mockResolvedValueOnce(rawgGameFixture());

            const res = await request(app).get('/api/games/rawg/1234');

            expect(res.statusCode).toBe(200);
            expect(getRawgGame).toHaveBeenCalledWith(1234);
            expect(res.body.name).toBe('Fixture Quest');
        });
    });

    describe('POST /api/games/rawg/:rawgId', () => {
        it('rejects requests with no auth token', async () => {
            const res = await request(app).post('/api/games/rawg/1234');
            expect(res.statusCode).toBe(401);
        });

        it('rejects an invalid rawgId', async () => {
            const res = await request(app)
                .post('/api/games/rawg/abc')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(400);
        });

        it('saves a new RAWG game and returns it', async () => {
            getRawgGame.mockResolvedValueOnce(rawgGameFixture());

            const res = await request(app)
                .post('/api/games/rawg/1234')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.game.rawgId).toBe(1234);

            const saved = await Game.findOne({ rawgId: 1234 });
            expect(saved).toBeTruthy();
        });

        it('upserts instead of duplicating on a second save of the same rawgId', async () => {
            getRawgGame.mockResolvedValueOnce(rawgGameFixture());
            await request(app).post('/api/games/rawg/1234').set('Authorization', `Bearer ${tokenA}`);

            getRawgGame.mockResolvedValueOnce(rawgGameFixture({ name: 'Fixture Quest: Updated' }));
            const res = await request(app)
                .post('/api/games/rawg/1234')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.game.name).toBe('Fixture Quest: Updated');

            const count = await Game.countDocuments({ rawgId: 1234 });
            expect(count).toBe(1);
        });
    });

    describe('GET /api/games/:gameId', () => {
        it('returns 400 for a game that does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/games/${fakeId}`);
            expect(res.statusCode).toBe(400);
        });

        it('returns a previously saved game', async () => {
            const game = await Game.create({ rawgId: 5678, name: 'Directly Saved Game', source: 'rawg' });

            const res = await request(app).get(`/api/games/${game._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Directly Saved Game');
        });
    });

    describe('POST /api/games/manual', () => {
        it('rejects requests with no auth token', async () => {
            const res = await request(app).post('/api/games/manual').send({ name: 'Manual Test Game' });
            expect(res.statusCode).toBe(401);
        });

        it('rejects a blank name', async () => {
            const res = await request(app)
                .post('/api/games/manual')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: '   ' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects a non-array genres field', async () => {
            const res = await request(app)
                .post('/api/games/manual')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Manual Test Game', genres: 'not-an-array' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects a non-array platforms field', async () => {
            const res = await request(app)
                .post('/api/games/manual')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Manual Test Game', platforms: 'not-an-array' });

            expect(res.statusCode).toBe(400);
        });

        it('rejects a non-array developers field', async () => {
            const res = await request(app)
                .post('/api/games/manual')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Manual Test Game', developers: 'not-an-array' });

            expect(res.statusCode).toBe(400);
        });

        it('creates a manual game entry', async () => {
            const res = await request(app)
                .post('/api/games/manual')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Manual Test Game Success', genres: ['RPG'] });

            expect(res.statusCode).toBe(201);
            expect(res.body.game.source).toBe('manual');
            expect(res.body.game.name).toBe('Manual Test Game Success');
        });
    });
});
