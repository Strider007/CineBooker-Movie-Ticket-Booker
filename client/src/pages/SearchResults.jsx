import axios from '../config/axiosConfig'
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loading from '../components/Loading'

const SearchResults = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const query = searchParams.get('q')
    const [results, setResults] = useState([])
    const [aiInterpretation, setAiInterpretation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)
                const response = await axios.get(`/showtime/smart-search?query=${encodeURIComponent(query)}`)
                setResults(response.data.data)
                setAiInterpretation(response.data.ai_interpretation)
            } catch (error) {
                console.error('Search error:', error)
                setError('Failed to fetch search results. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchResults()
    }, [query])

    const handleShowtimeClick = (showtimeId) => {
        navigate(`/showtime/${showtimeId}`)
    }

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-500">
            <Navbar />
            <Loading />
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-500">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
                    <p className="text-white/80">Query: "{query}"</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {aiInterpretation && (
                    <div className="bg-white/10 rounded-lg p-4 mb-6">
                        <h3 className="text-white font-semibold mb-3">AI Interpretation:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Movie</span>
                                <span className="text-white font-medium">{aiInterpretation.movieTitle || 'Any'}</span>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Location</span>
                                <span className="text-white font-medium">{aiInterpretation.location || 'Any'}</span>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Cinema</span>
                                <span className="text-white font-medium">{aiInterpretation.cinemaName || 'Any'}</span>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Time Filter</span>
                                <span className="text-white font-medium">
                                    {aiInterpretation.timeFilter ?
                                        aiInterpretation.timeFilter.replace('_', ' ').toUpperCase() :
                                        'Any'}
                                </span>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Sort By</span>
                                <span className="text-white font-medium">
                                    {aiInterpretation.sort === 'showtime' ? 'Showtime (Earliest)' : 'None'}
                                </span>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <span className="text-white/60 block">Intent</span>
                                <span className="text-white font-medium">{aiInterpretation.intent.replace('_', ' ').toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <p className="text-white/80">{results.length} results found</p>
                </div>

                <div className="grid gap-4">
                    {results.map(showtime => (
                        <div
                            key={showtime._id}
                            className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                            onClick={() => handleShowtimeClick(showtime._id)}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                                        {showtime.movie?.name || 'Unknown Movie'}
                                    </h3>
                                    <div className="text-gray-600 space-y-1">
                                        <p><span className="font-medium">Cinema:</span> {showtime.theater?.cinema?.name || 'Unknown'}</p>
                                        <p><span className="font-medium">Theater:</span> {showtime.theater?.number || 'Unknown'}</p>
                                        <p><span className="font-medium">Location:</span> {showtime.theater?.cinema?.address || 'Unknown'}</p>
                                        <p><span className="font-medium">Showtime:</span> {new Date(showtime.showtime).toLocaleString()}</p>
                                        {showtime.price && (
                                            <p><span className="font-medium">Price:</span> ₹{showtime.price}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleShowtimeClick(showtime._id)
                                        }}
                                    >
                                        Book Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {results.length === 0 && !loading && !error && (
                    <div className="text-center py-12">
                        <p className="text-white/80 text-lg">No showtimes found for your search.</p>
                        <p className="text-white/60 mt-2">Try different keywords like "movies near me" or "cheapest tickets"</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SearchResults