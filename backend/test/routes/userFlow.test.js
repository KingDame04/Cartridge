jest.mock('../../src/utils/email', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue()
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

const User = require('../../src/models/users');
const List = require('../../src/models/list');
const Game = require('../../src/models/games');
const GameUserEntry = require('../../src/models/gameUserEntry');

describe('User Integration Flow', () => {

    let email;
    // Must satisfy the server-side password complexity check (upper/lower/
    // digit/special, 8-14 chars) added to register/resetPassword/account
    // after this test was originally written.
    let password = 'Passw0rd!';

    let user;
    let token;

    let listId;
    let game;
    let entryId;


    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        email = `flowtest-${new mongoose.Types.ObjectId()}@cartridgeapp.fun`;
    });


    afterAll(async () => {

        if (user) {
            await List.deleteMany({ userId: user._id });
            await GameUserEntry.deleteMany({ userId: user._id });
            await User.deleteOne({ _id: user._id });
        }

        if (game) {
            await Game.deleteOne({ _id: game._id });
        }

        await mongoose.connection.close();
    });


    it('1. Register user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'FlowTester',
                email,
                password,
                confirmPassword: password
            });
        expect(res.statusCode).toBe(201);
        user = await User.findOne({ email });
        expect(user).toBeDefined();
        expect(user.isVerified).toBe(false);
        expect(user.verificationToken).toBeDefined();
    });
    it('2. Verify email', async () => {

        const res = await request(app)
            .get(`/api/auth/verifyEmail?token=${user.verificationToken}`);
        expect(res.statusCode).toBe(200);
        user = await User.findOne({ email });
        expect(user.isVerified).toBe(true);
    });
    it('3. Login user', async () => {

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email,
                password
            });


        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();


        token = res.body.token;

    });


    it('4. Create game list', async () => {

        const res = await request(app)
            .post('/api/lists')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'E2E Backlog'
            });


        expect(res.statusCode).toBe(201);


        listId = res.body.list._id;

    });


    it('5. Add game entry', async () => {


        game = await Game.create({
            name: 'Chrono Trigger E2E',
            source: 'manual'
        });


        const res = await request(app)
            .post('/api/user-game-entries')
            .set('Authorization', `Bearer ${token}`)
            .send({
                gameId: game._id.toString(),
                listIds: [listId]
            });


        expect([200,201]).toContain(res.statusCode);


        entryId = (
            res.body.entry ||
            res.body.gameUserEntry ||
            res.body
        )._id;


        expect(entryId).toBeDefined();

    });


    it('6. Delete game entry', async () => {


        const res = await request(app)
            .delete(`/api/user-game-entries/${entryId}`)
            .set('Authorization', `Bearer ${token}`);


        expect(res.statusCode).toBe(200);


        const deletedEntry =
            await GameUserEntry.findById(entryId);


        expect(deletedEntry).toBeNull();

    });


    it('7. Logout user', async () => {


        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);


        expect(res.statusCode).toBe(200);

    });

});