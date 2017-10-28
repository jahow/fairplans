export default class ColorTools {

	// inputs are [0,1] values
	// output is a {r, g, b } object with [00,FF] values
	static getRandomColor(hue: number, value: number, saturation: number) {
		// var h = Math.random();
		// var v = 0.7;
		// var s = 0.72;

		// HSV to RGB conversion, as seen here: http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
		var r, g, b, i, f, p, q, t;
		i = Math.floor(hue * 6);
		f = hue * 6 - i;
		p = value * (1 - saturation);
		q = value * (1 - f * saturation);
		t = value * (1 - (1 - f) * saturation);
		switch (i % 6) {
			case 0: r = value, g = t, b = p; break;
			case 1: r = q, g = value, b = p; break;
			case 2: r = p, g = value, b = t; break;
			case 3: r = p, g = q, b = value; break;
			case 4: r = t, g = p, b = value; break;
			case 5: r = value, g = p, b = q; break;
		}

		// function toHex(c) { return Math.floor(c * 255).toString(16); }
		// return "#" + toHex(r) + toHex(g) + toHex(b);
		return {
			r: Math.floor(r * 255),
			g: Math.floor(g * 255),
			b: Math.floor(b * 255),
		}
	}

	// set color to CSS format
	static formatColorCSS(color: {r: number, g: number, b: number}) {
		return `#${color.r.toString(16)}${color.g.toString(16)}${color.b.toString(16)}`;
	}
}