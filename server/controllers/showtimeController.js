const Movie = require('../models/Movie')
const Showtime = require('../models/Showtime')
const Theater = require('../models/Theater')
const User = require('../models/User')
const { parseSearchIntent } = require('../utils/aiParser')

//@desc     GET showtimes
//@route    GET /showtime
//@access   Public
exports.getShowtimes = async (req, res, next) => {
	try {
		const showtimes = await Showtime.find({ isRelease: true })
			.populate([
				'movie',
				{ path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'number cinema seatPlan' }
			])
			.select('-seats.user -seats.row -seats.number')

		res.status(200).json({ success: true, count: showtimes.length, data: showtimes })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     GET showtimes with all unreleased showtime
//@route    GET /showtime/unreleased
//@access   Private admin
exports.getUnreleasedShowtimes = async (req, res, next) => {
	try {
		const showtimes = await Showtime.find()
			.populate([
				'movie',
				{ path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'number cinema seatPlan' }
			])
			.select('-seats.user -seats.row -seats.number')

		res.status(200).json({ success: true, count: showtimes.length, data: showtimes })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     GET single showtime
//@route    GET /showtime/:id
//@access   Public
exports.getShowtime = async (req, res, next) => {
	try {
		const showtime = await Showtime.findById(req.params.id)
			.populate([
				'movie',
				{ path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'number cinema seatPlan' }
			])
			.select('-seats.user')

		if (!showtime) {
			return res.status(400).json({ success: false, message: `Showtime not found with id of ${req.params.id}` })
		}

		if (!showtime.isRelease) {
			return res.status(400).json({ success: false, message: `Showtime is not released` })
		}

		res.status(200).json({ success: true, data: showtime })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     GET single showtime with user
//@route    GET /showtime/user/:id
//@access   Private Admin
exports.getShowtimeWithUser = async (req, res, next) => {
	try {
		const showtime = await Showtime.findById(req.params.id).populate([
			'movie',
			{ path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'number cinema seatPlan' },
			{ path: 'seats', populate: { path: 'user', select: 'username email role' } }
		])

		if (!showtime) {
			return res.status(400).json({ success: false, message: `Showtime not found with id of ${req.params.id}` })
		}

		res.status(200).json({ success: true, data: showtime })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Add Showtime
//@route    POST /showtime
//@access   Private
exports.addShowtime = async (req, res, next) => {
	try {
		const { movie: movieId, showtime: showtimeString, theater: theaterId, repeat = 1, isRelease } = req.body

		if (repeat > 31 || repeat < 1) {
			return res.status(400).json({ success: false, message: `Repeat is not a valid number between 1 to 31` })
		}

		let showtime = new Date(showtimeString)
		let showtimes = []
		let showtimeIds = []

		const theater = await Theater.findById(theaterId)

		if (!theater) {
			return res.status(400).json({ success: false, message: `Theater not found with id of ${req.params.id}` })
		}

		const movie = await Movie.findById(movieId)

		if (!movie) {
			return res.status(400).json({ success: false, message: `Movie not found with id of ${movieId}` })
		}

		for (let i = 0; i < repeat; i++) {
			const showtimeDoc = await Showtime.create({ theater, movie: movie._id, showtime, isRelease })

			showtimeIds.push(showtimeDoc._id)
			showtimes.push(new Date(showtime))
			showtime.setDate(showtime.getDate() + 1)
		}
		theater.showtimes = theater.showtimes.concat(showtimeIds)

		await theater.save()

		res.status(200).json({
			success: true,
			showtimes: showtimes
		})
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Purchase seats
//@route    POST /showtime/:id
//@access   Private
exports.purchase = async (req, res, next) => {
	try {
		const { seats } = req.body
		const user = req.user

		const showtime = await Showtime.findById(req.params.id).populate({ path: 'theater', select: 'seatPlan' })

		if (!showtime) {
			return res.status(400).json({ success: false, message: `Showtime not found with id of ${req.params.id}` })
		}

		const isSeatValid = seats.every((seatNumber) => {
			const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
			const maxRow = showtime.theater.seatPlan.row
			const maxCol = showtime.theater.seatPlan.column

			if (maxRow.length !== row.length) {
				return maxRow.length > row.length
			}

			return maxRow.localeCompare(row) >= 0 && number <= maxCol
		})

		if (!isSeatValid) {
			return res.status(400).json({ success: false, message: 'Seat is not valid' })
		}

		const isSeatAvailable = seats.every((seatNumber) => {
			const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
			return !showtime.seats.some((seat) => seat.row === row && seat.number === parseInt(number, 10))
		})

		if (!isSeatAvailable) {
			return res.status(400).json({ success: false, message: 'Seat not available' })
		}

		const seatUpdates = seats.map((seatNumber) => {
			const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
			return { row, number: parseInt(number, 10), user: user._id }
		})

		showtime.seats.push(...seatUpdates)
		const updatedShowtime = await showtime.save()

		const updatedUser = await User.findByIdAndUpdate(
			user._id,
			{
				$push: { tickets: { showtime, seats: seatUpdates } }
			},
			{ new: true }
		)

		res.status(200).json({ success: true, data: updatedShowtime, updatedUser })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Update showtime
//@route    PUT /showtime/:id
//@access   Private Admin
exports.updateShowtime = async (req, res, next) => {
	try {
		const showtime = await Showtime.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true
		})

		if (!showtime) {
			return res.status(400).json({ success: false, message: `Showtime not found with id of ${req.params.id}` })
		}
		res.status(200).json({ success: true, data: showtime })
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Delete single showtime
//@route    DELETE /showtime/:id
//@access   Private Admin
exports.deleteShowtime = async (req, res, next) => {
	try {
		const showtime = await Showtime.findById(req.params.id)

		if (!showtime) {
			return res.status(400).json({ success: false, message: `Showtime not found with id of ${req.params.id}` })
		}

		await showtime.deleteOne()

		res.status(200).json({ success: true })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Delete showtimes
//@route    DELETE /showtime
//@access   Private Admin
exports.deleteShowtimes = async (req, res, next) => {
	try {
		const { ids } = req.body

		let showtimesIds

		if (!ids) {
			// Delete all showtimes
			showtimesIds = await Showtime.find({}, '_id')
		} else {
			// Find showtimes based on the provided IDs
			showtimesIds = await Showtime.find({ _id: { $in: ids } }, '_id')
		}

		for (const showtimeId of showtimesIds) {
			await showtimeId.deleteOne()
		}

		res.status(200).json({ success: true, count: showtimesIds.length })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Delete previous day showtime
//@route    DELETE /showtime/previous
//@access   Private Admin
exports.deletePreviousShowtime = async (req, res, next) => {
	try {
		const currentDate = new Date()
		currentDate.setHours(0, 0, 0, 0)

		const showtimesIds = await Showtime.find({ showtime: { $lt: currentDate } }, '_id')

		for (const showtimeId of showtimesIds) {
			await showtimeId.deleteOne()
		}

		res.status(200).json({ success: true, count: showtimesIds.length })
	} catch (err) {
		console.log(err)
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Smart Search using AI intent parsing
//@route    GET /showtime/smart-search
//@access   Public
exports.smartSearch = async (req, res, next) => {
	try {
		const { query } = req.query
		if (!query) {
			return res.status(400).json({ success: false, message: 'Please provide a search query' })
		}

		// 1. Get structured intent from AI
		const intent = await parseSearchIntent(query)

		// 2. Build MongoDB query based on AI intent
		let queryConditions = { isRelease: true }

		// Add time-based filtering
		if (intent.timeFilter) {
			const now = new Date()
			let startDate, endDate

			switch (intent.timeFilter) {
				case 'today':
					startDate = new Date(now)
					startDate.setHours(0, 0, 0, 0)
					endDate = new Date(now)
					endDate.setHours(23, 59, 59, 999)
					break
				case 'tomorrow':
					startDate = new Date(now)
					startDate.setDate(now.getDate() + 1)
					startDate.setHours(0, 0, 0, 0)
					endDate = new Date(startDate)
					endDate.setHours(23, 59, 59, 999)
					break
				case 'this_week':
					startDate = new Date(now)
					startDate.setHours(0, 0, 0, 0)
					endDate = new Date(now)
					endDate.setDate(now.getDate() + 7)
					endDate.setHours(23, 59, 59, 999)
					break
				case 'weekend':
					const dayOfWeek = now.getDay()
					const daysUntilSaturday = (6 - dayOfWeek) % 7
					startDate = new Date(now)
					startDate.setDate(now.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday))
					startDate.setHours(0, 0, 0, 0)
					endDate = new Date(startDate)
					endDate.setDate(startDate.getDate() + 1)
					endDate.setHours(23, 59, 59, 999)
					break
				case 'morning':
					// Will be filtered after query
					break
				case 'afternoon':
					// Will be filtered after query
					break
				case 'evening':
					// Will be filtered after query
					break
				case 'night':
					// Will be filtered after query
					break
			}

			if (startDate && endDate) {
				queryConditions.showtime = { $gte: startDate, $lte: endDate }
			}
		}

		// 3. Initial Fetch with deep population (Showtime -> Theater -> Cinema)
		let showtimes = await Showtime.find(queryConditions)
			.populate('movie')
			.populate({
				path: 'theater',
				populate: { path: 'cinema', select: 'name' },
				select: 'number cinema'
			})

		// 4. Filter by Movie Title (if AI found one)
		if (intent.movieTitle) {
			const title = intent.movieTitle.toLowerCase()
			showtimes = showtimes.filter(st => st.movie && st.movie.name.toLowerCase().includes(title))
		}

		// 5. Filter by Cinema Name (if AI found one)
		if (intent.cinemaName) {
			const cinemaName = intent.cinemaName.toLowerCase()
			showtimes = showtimes.filter(
				st => st.theater && st.theater.cinema && st.theater.cinema.name.toLowerCase().includes(cinemaName)
			)
		}

		// 6. Filter by Location (if AI found one, e.g., "Raja Park")
		if (intent.location) {
			const loc = intent.location.toLowerCase()
			showtimes = showtimes.filter(st => {
				if (!st.theater || !st.theater.cinema) return false
				const cinemaName = st.theater.cinema.name.toLowerCase()
				// Check cinema name for the location keyword (locations are embedded in cinema names)
				return cinemaName.includes(loc)
			})
		}

		// 7. Filter by time of day (morning/afternoon/evening/night)
		if (intent.timeFilter && ['morning', 'afternoon', 'evening', 'night'].includes(intent.timeFilter)) {
			showtimes = showtimes.filter(st => {
				const hour = new Date(st.showtime).getHours()
				switch (intent.timeFilter) {
					case 'morning':
						return hour >= 6 && hour < 12
					case 'afternoon':
						return hour >= 12 && hour < 17
					case 'evening':
						return hour >= 17 && hour < 22
					case 'night':
						return hour >= 22 || hour < 6
					default:
						return true
				}
			})
		}

		// 8. Apply Sorting (only showtime sorting available)
		if (intent.sort === 'showtime') {
			showtimes.sort((a, b) => new Date(a.showtime) - new Date(b.showtime))
		}

		res.status(200).json({
			success: true,
			count: showtimes.length,
			ai_interpretation: intent,
			data: showtimes
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: 'Server Error during smart search' })
	}
}
