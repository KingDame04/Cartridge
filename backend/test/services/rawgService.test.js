const { searchRawgGames, getRawgGame } = require('../../src/services/rawgService');

describe('rawgService', () => {
    const originalApiKey = process.env.RAWG_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.RAWG_API_KEY = 'test-api-key';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        process.env.RAWG_API_KEY = originalApiKey;
        global.fetch = originalFetch;
    });

    describe('searchRawgGames', () => {
        test('requests the /games endpoint with search, page, and page_size params', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 1, results: [{ id: 1, name: 'Test Game' }] })
            });

            const data = await searchRawgGames('zelda', 2, 10);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const calledUrl = new URL(global.fetch.mock.calls[0][0]);
            expect(calledUrl.pathname).toBe('/api/games');
            expect(calledUrl.searchParams.get('search')).toBe('zelda');
            expect(calledUrl.searchParams.get('page')).toBe('2');
            expect(calledUrl.searchParams.get('page_size')).toBe('10');
            expect(calledUrl.searchParams.get('key')).toBe('test-api-key');
            expect(data.results[0].name).toBe('Test Game');
        });

        test('defaults page to 1 and pageSize to 20 when omitted', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 0, results: [] })
            });

            await searchRawgGames('mario');

            const calledUrl = new URL(global.fetch.mock.calls[0][0]);
            expect(calledUrl.searchParams.get('page')).toBe('1');
            expect(calledUrl.searchParams.get('page_size')).toBe('20');
        });

        test('throws when the RAWG API responds with a non-ok status', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

            await expect(searchRawgGames('zelda')).rejects.toThrow(
                'RAWG request failed with status 500'
            );
        });

        test('throws when RAWG_API_KEY is not configured', async () => {
            delete process.env.RAWG_API_KEY;

            await expect(searchRawgGames('zelda')).rejects.toThrow(
                'RAWG_API_KEY is missing from the .env file'
            );
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('getRawgGame', () => {
        test('requests the /games/:id endpoint', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 42, name: 'Answer Game' })
            });

            const data = await getRawgGame(42);

            const calledUrl = new URL(global.fetch.mock.calls[0][0]);
            expect(calledUrl.pathname).toBe('/api/games/42');
            expect(data.name).toBe('Answer Game');
        });

        test('throws when the RAWG API responds with a non-ok status', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

            await expect(getRawgGame(999999)).rejects.toThrow(
                'RAWG request failed with status 404'
            );
        });
    });
});
