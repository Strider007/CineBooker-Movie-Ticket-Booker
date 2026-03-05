import axios from '../config/axiosConfig'
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import Navbar from '../components/Navbar'
import NowShowing from '../components/NowShowing'
import TheaterListsByMovie from '../components/TheaterListsByMovie'
import { AuthContext } from '../context/AuthContext'

const Home = () => {
	const { auth } = useContext(AuthContext)
	const navigate = useNavigate()
	const [selectedMovieIndex, setSelectedMovieIndex] = useState(parseInt(sessionStorage.getItem('selectedMovieIndex')))
	const [movies, setMovies] = useState([])
	const [isFetchingMoviesDone, setIsFetchingMoviesDone] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	const fetchMovies = async (data) => {
		try {
			setIsFetchingMoviesDone(false)
			let response
			if (auth.role === 'admin') {
				response = await axios.get('/movie/unreleased/showing', {
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				})
			} else {
				response = await axios.get('/movie/showing')
			}
			// console.log(response.data.data)
			setMovies(response.data.data)
		} catch (error) {
			console.error(error)
		} finally {
			setIsFetchingMoviesDone(true)
		}
	}

	useEffect(() => {
		fetchMovies()
	}, [])

	const handleSearch = (e) => {
		e.preventDefault()
		if (searchQuery.trim()) {
			navigate(`/search-results?q=${encodeURIComponent(searchQuery)}`)
		}
	}

	const props = {
		movies,
		selectedMovieIndex,
		setSelectedMovieIndex,
		auth,
		isFetchingMoviesDone
	}
	return (
		<div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-red-900 to-red-500 pb-8 sm:gap-8">
			<Navbar />
			{/* Hero Section */}
			<div className="relative overflow-hidden bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white">
				<div className="absolute inset-0 bg-black bg-opacity-20"></div>
				<div className="relative z-10 px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
					<h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						Book Your Movie Experience
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl">
						Discover the latest movies, find the best theaters, and reserve your seats in just a few clicks.
					</p>
					<div className="mt-8 flex justify-center">
						<div className="inline-flex rounded-md shadow">
							<a
								href="#search"
								className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-red-600 hover:bg-gray-50 transition-colors duration-200"
							>
								Get Started
							</a>
						</div>
					</div>
				</div>
			</div>
			{/* Search Bar */}
			<div id="search" className="flex justify-center px-4">
				<form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Find movies, cinemas, locations... (e.g., 'avengers tomorrow', 'movies in raja park', 'latest shows at inox')"
						className="flex-1 px-4 py-3 rounded-lg text-black text-lg shadow-lg"
					/>
					<button
						type="submit"
						className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg text-white font-medium shadow-lg transition-colors"
					>
						Search
					</button>
				</form>
			</div>
			<NowShowing {...props} />
			{movies[selectedMovieIndex]?.name && <TheaterListsByMovie {...props} />}
		</div>
	)
}

export default Home
