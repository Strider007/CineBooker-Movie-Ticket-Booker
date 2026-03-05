const { GoogleGenerativeAI } = require("@google/generative-ai");


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


function parseWithRegex(userInput) {
    const input = userInput.toLowerCase().trim();


    const atPattern = /^(.+?)\s+at\s+(.+)$/;
    const atMatch = input.match(atPattern);
    if (atMatch) {
        return {
            movieTitle: atMatch[1].trim(),
            location: atMatch[2].trim(),
            cinemaName: null,
            timeFilter: null,
            sort: null,
            intent: 'search'
        };
    }

    const inPattern = /^(.+?)\s+in\s+(.+)$/;
    const inMatch = input.match(inPattern);
    if (inMatch) {
        return {
            movieTitle: inMatch[1].trim(),
            location: inMatch[2].trim(),
            cinemaName: null,
            timeFilter: null,
            sort: null,
            intent: 'search'
        };
    }


    const nearPattern = /^(.+?)\s+near\s+(.+)$/;
    const nearMatch = input.match(nearPattern);
    if (nearMatch) {
        return {
            movieTitle: nearMatch[1].trim(),
            location: nearMatch[2].trim(),
            cinemaName: null,
            timeFilter: null,
            sort: null,
            intent: 'search'
        };
    }

    const timeWords = ['tomorrow', 'today', 'weekend', 'this week', 'next week'];
    for (const timeWord of timeWords) {
        if (input.includes(timeWord)) {
            const moviePart = input.replace(timeWord, '').trim();
            return {
                movieTitle: moviePart || null,
                location: null,
                cinemaName: null,
                timeFilter: timeWord,
                sort: null,
                intent: 'search'
            };
        }
    }

    const cinemaPattern = /^(.+?)\s+(movies?|cinemas?)$/;
    const cinemaMatch = input.match(cinemaPattern);
    if (cinemaMatch) {
        return {
            movieTitle: null,
            location: null,
            cinemaName: cinemaMatch[1].trim(),
            timeFilter: null,
            sort: null,
            intent: 'search'
        };
    }


    return null;
}

/**
 * Parses natural language into database-friendly parameters
 * @param {string} userInput 
 */
exports.parseSearchIntent = async (userInput) => {
    try {
       
        const regexResult = parseWithRegex(userInput);
        if (regexResult) {
            return regexResult;
        }

     
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Parse this movie search: "${userInput}"

PATTERNS:
- "MOVIE at LOCATION" → movieTitle: "MOVIE", location: "LOCATION"
- "MOVIE in LOCATION" → movieTitle: "MOVIE", location: "LOCATION"
- "MOVIE near LOCATION" → movieTitle: "MOVIE", location: "LOCATION"
- "MOVIE tomorrow" → movieTitle: "MOVIE", timeFilter: "tomorrow"
- "CINEMA movies" → cinemaName: "CINEMA"

EXACT MATCHES:
"avengers at raja park" → {"movieTitle": "avengers", "location": "raja park", "cinemaName": null, "timeFilter": null, "sort": null}
"batman tomorrow" → {"movieTitle": "batman", "location": null, "cinemaName": null, "timeFilter": "tomorrow", "sort": null}
"pvr cinemas" → {"movieTitle": null, "location": null, "cinemaName": "pvr", "timeFilter": null, "sort": null}

For "${userInput}", output only the JSON:
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();


        const cleanJson = text.replace(/```json|```/g, "").trim();

        const parsed = JSON.parse(cleanJson);

        return {
            movieTitle: parsed.movieTitle?.toLowerCase().trim() || null,
            location: parsed.location?.toLowerCase().trim() || null,
            cinemaName: parsed.cinemaName?.toLowerCase().trim() || null,
            timeFilter: parsed.timeFilter || null,
            sort: parsed.sort === 'showtime' ? 'showtime' : null, 
            intent: 'search' 
        };

    } catch (error) {
        console.error("AI Parsing Error:", error);

        return {
            movieTitle: userInput.toLowerCase().trim(),
            location: null,
            cinemaName: null,
            timeFilter: null,
            sort: null,
            intent: "search"
        };
    }
};