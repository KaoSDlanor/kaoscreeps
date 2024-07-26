export const lerp = (min: number, max: number, fraction: number) => {
	return min + (max - min) * fraction;
};
