import { CheckIcon } from '@heroicons/react/24/outline'
import { memo, useState } from 'react'

const Seat = ({ seat, setSelectedSeats, selectable, isAvailable }) => {
	const [isSelected, setIsSelected] = useState(false)
	return !isAvailable ? (
		<button
			aria-label={`Seat ${seat.row}${seat.number} - Booked`}
			className="flex h-8 w-8 cursor-not-allowed items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
		>
			<div className="h-6 w-6 rounded bg-gray-500 drop-shadow-md transition-all duration-200"></div>
		</button>
	) : isSelected ? (
		<button
			aria-label={`Seat ${seat.row}${seat.number} - Selected`}
			className="flex h-8 w-8 items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
			onClick={() => {
				setIsSelected(false)
				setSelectedSeats((prev) => prev.filter((e) => e !== `${seat.row}${seat.number}`))
			}}
		>
			<div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 drop-shadow-md transition-all duration-200">
				<CheckIcon className="h-5 w-5 stroke-[3] text-white" />
			</div>
		</button>
	) : (
		<button
			aria-label={`Seat ${seat.row}${seat.number} - Available`}
			className={`flex h-8 w-8 items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 ${!selectable && 'cursor-not-allowed'}`}
			onClick={() => {
				if (selectable) {
					setIsSelected(true)
					setSelectedSeats((prev) => [...prev, `${seat.row}${seat.number}`])
				}
			}}
		>
			<div className="h-6 w-6 rounded bg-white drop-shadow-md transition-all duration-200 hover:bg-red-100"></div>
		</button>
	)
}

export default memo(Seat)
