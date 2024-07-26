export type DistanceValue = {
	/** distance from the nearest location */
	d: number;
	/** index of the nearest location */
	f: number;
};

export type DistanceField = {
	locations: number[];
	values: DistanceValue[];
	width: number;
	height: number;
};

export type Location = {
	x: number;
	y: number;
};

export const locationToIndex = (location: Location, width: number): number => {
	return location.y * width + location.x;
};

export const indexToLocation = (index: number, width: number): Location => {
	const x = index % width;
	const y = Math.floor(index / width);
	return { x, y };
};

export const getNeighbors = (index: number, width: number): number[] => {
	return [
		// index - width - 1, // top left
		index - width, // top center
		// index - width + 1, // top right
		index - 1, // center left
		index + 1, // center right
		// index + width - 1, // bottom left
		index + width, // bottom center
		// index + width + 1, // bottom right
	].filter((neighbor) => neighbor >= 0 && neighbor < width * width);
};

export const createDistanceField = (
	width: number,
	height: number
): DistanceField => {
	const output: DistanceField = {
		locations: [],
		values: [],
		width: width,
		height: height,
	};

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = locationToIndex({ x, y }, width);
			const distance = width * height;
			output.values[index] = { d: distance, f: -1 };
		}
	}

	return output;
};

export const addLocations = (
	distanceField: DistanceField,
	locations: Location[]
): DistanceField => {
	const updateStack: { distance: number; target: number; from: number }[] = [];

	for (const location of locations) {
		const index = locationToIndex(location, distanceField.width);
		if (distanceField.locations.includes(index)) continue;
		distanceField.locations.push(index);
		updateStack.push({ distance: 0, target: index, from: index });
	}

	while (true) {
		const update = updateStack.shift()!;
		if (update == null) break;

		if (distanceField.values[update.target].d <= update.distance) continue;
		distanceField.values[update.target] = {
			d: update.distance,
			f: update.from,
		};

		const neighbors = getNeighbors(update.target, distanceField.width);
		for (const neighbor of neighbors) {
			updateStack.push({
				distance: update.distance + 1,
				target: neighbor,
				from: update.from,
			});
		}
	}

	return distanceField;
};

export const getClosestLocation = (
	distanceField: DistanceField,
	currentLocation: Location
): Location => {
	const currentIndex = locationToIndex(currentLocation, distanceField.width);
	const locationIndex = distanceField.values[currentIndex].f;
	return indexToLocation(locationIndex, distanceField.width);
};
