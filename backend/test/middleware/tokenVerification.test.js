require('dotenv').config();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../src/middleware/tokenVerification');

describe('Java Web Token Verification Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    test('should call next() and populate req.users if valid token is provided', () => {
        const payload = { userId: '12345', role: 'user' }; 
        const validToken = jwt.sign(payload,process.env.JWT_SECRET); // Test token signed with test secret

        req.headers['authorization'] = `Bearer ${validToken}`; // Simulate sending "Bearer <token>" in authorization header

        authenticateToken(req, res, next);

        //Assertions
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('12345');
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 if authorization header is missing', () => {
        // Leave req.headers['authorization'] undefined

        authenticateToken(req, res, next);

        //Assertions
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Access Denied: Header must follow standard Bearer schema' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if token is invalid or expired', () => {
        const invalidToken = jwt.sign({ userId: '12345' }, 'wrong_secret');
        req.headers['authorization'] = `Bearer ${invalidToken}`;

        authenticateToken(req, res, next);

        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
    });
})

// command: 'npm test' ; to run jest tests
