const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {

    if (!process.env.JWT_SECRET) {
        console.error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
        return res.status(500).json({ message: 'Internal server configuration error' });
    }
    
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        return res.status(401).json({ message: 'Access Denied: Header must follow standard Bearer schema' });
    }

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            const isExpired = err.name === 'TokenExpiredError';
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;

        // Sliding session: reissue a fresh 20-minute token on every
        // authenticated request, so an active user never gets logged out,
        // while a genuinely inactive one has their last token actually
        // expire after 20 minutes. Clients apply this transparently.
        const refreshedToken = jwt.sign(
            { userId: decoded.userId, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: '20m' }
        );
        res.setHeader('X-Refreshed-Token', refreshedToken);

        next();
    });
}
module.exports = { authenticateToken };