var
	BYTE_MIN_VALUE = -128,
	BYTE_MAX_VALUE = 127,
	DOUBLE_MIN_VALUE = 4.9E-324,
	DOUBLE_MAX_VALUE = 1.7976931348623157E308,
	FLOAT_MIN_VALUE = 1.4E-45,
	FLOAT_MAX_VALUE = 3.4028235E38,
	INT_MIN_VALUE = -2147483648,
	INT_MAX_VALUE = 2147483647,
	LONG_MIN_VALUE = -9223372036854776000, // actual value = -9223372036854775808,
	LONG_MAX_VALUE = 9223372036854776000, // actual value = 9223372036854775807,
	SHORT_MIN_VALUE = -32768,
	SHORT_MAX_VALUE = 32767,

	VALID_GEO_SHAPE_TYPES = [
		'point',
		'linestring',
		'polygon',
		'multipoint',
		'multilinestring',
		'multipolygon',
		'geometrycollection',
		'envelope',
		'circle'
	];

module.exports = (function (self) {
	'use strict';

	var
		echo = (value) => value,
		reIPv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
		reISO8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/,
		// length is a multiple of 8, has valid chars and is padded properly with "="
		reBase32 = /^([a-z2-7]{8})*([a-z2-7]{8}|[a-z2-7]{2}={6}|[a-z2-7]{4}={4}|[a-z2-7]{5}={3}|[a-z2-7]{7}=)$/i,
		// length is a multiple of 4, has valid chars and is padded properly with "="
		reBase64 = /^([a-z\d+/]{4})*([a-z\d+/]{4}|[a-z\d+/]{3}=|[a-z\d+/]{2}==)$/i,
		reBoolean = /^(true|on|yes|1|false|off|no|0)$/;

	function isMissingWhenRequired (field, value) {
		if (field && field.required && typeof field.required === 'boolean') {
			return (
				isUndefined(value) ||
				((self.isPOJO(value) && !Object.keys(value).length) ||
				(typeof value === 'string' && !value.length)));
		}

		return false;
	}

	function isUndefined (value) {
		return value === null || typeof value === 'undefined';
	}

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-attachment-type.html
	self.attachment = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && typeof value !== 'string',
				!isUndefined(value) && !reBase64.test(value)
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/master/binary.html
	self.binary = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && typeof value !== 'string',
				!isUndefined(value) && !reBase64.test(value)
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/master/boolean.html
	self.boolean = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) &&
					typeof value === 'string' &&
					!reBoolean.test(value),
				!isUndefined(value) &&
					typeof value !== 'string' &&
					typeof value !== 'boolean' &&
					typeof value !== 'number'
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.byte = (field) => {
		return (value) => {
			var parsedValue = Number(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < BYTE_MIN_VALUE,
				!isUndefined(value) && parsedValue > BYTE_MAX_VALUE
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/master/date.html
	self.date = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) &&
					typeof value !== 'number' &&
					typeof value !== 'string' &&
					!(value instanceof Date),
				!isUndefined(value) &&
					typeof value === 'string' &&
					!reISO8601.test(value) &&
					isNaN(new Date(value))
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.double = (field) => {
		return (value) => {
			var parsedValue = parseFloat(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < DOUBLE_MIN_VALUE,
				!isUndefined(value) && parsedValue > DOUBLE_MAX_VALUE
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.float = (field) => {
		return (value) => {
			var parsedValue = parseFloat(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < FLOAT_MIN_VALUE,
				!isUndefined(value) && parsedValue > FLOAT_MAX_VALUE
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-geo-point-type.html
	/*eslint camelcase:0*/
	self.geo_point = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),

				!isUndefined(value) &&
					Array.isArray(value) &&
					(value.length !== 2 || isNaN(value[0]) || isNaN(value[1])),

				!isUndefined(value) &&
					typeof value === 'object' &&
					!Array.isArray(value) &&
					(isUndefined(value.lat) || isUndefined(value.lon)),

				!isUndefined(value) &&
					typeof value === 'string' &&
					/\,/.test(value) &&
					value.split(/\,/).length !== 2,

				!isUndefined(value) &&
					typeof value === 'string' &&
					!/\,/.test(value) &&
					!reBase32.test(value)
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-geo-shape-type.html
	/*eslint camelcase:0*/
	self.geo_shape = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),

				!isUndefined(value) &&
					value.type !== 'geometrycollection' &&
					(!value.type || !value.coordinates),

				!isUndefined(value) &&
					value.type === 'geometrycollection' &&
					(!value.type || !value.geometries),

				!isUndefined(value) &&
					value.type === 'geometrycollection' &&
					value.geometries && value.geometries.some((coords) => !self.geo_shape(field)(coords)),

				!isUndefined(value) && VALID_GEO_SHAPE_TYPES.indexOf(value.type) < 0
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.integer = (field) => {
		return (value) => {
			var parsedValue = Number(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < INT_MIN_VALUE,
				!isUndefined(value) && parsedValue > INT_MAX_VALUE
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-ip-type.html
	self.ip = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && typeof value !== 'string',
				!isUndefined(value) && !reIPv4.test(value)
			].some(echo);
		};
	};

	self.isPOJO = (value) => {
		return ![
			value === null,
			typeof value === 'undefined',
			typeof value !== 'object',
			Array.isArray(value),
			value &&
				value.toString &&
				!(/^\[object\sObject\]$/.test(value.toString()))
		].some(echo);
	};

	self.isUndefined = isUndefined;

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.long = (field) => {
		return (value) => {
			var parsedValue = Number(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < LONG_MIN_VALUE,
				!isUndefined(value) && parsedValue > LONG_MAX_VALUE
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-object-type.html
	self.object = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && typeof value !== 'object'
			].some(echo);
		};
	};

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-core-types.html#number
	self.short = (field) => {
		return (value) => {
			var parsedValue = Number(value);

			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) && isNaN(parsedValue),
				!isUndefined(value) && parsedValue < SHORT_MIN_VALUE,
				!isUndefined(value) && parsedValue > SHORT_MAX_VALUE
			].some(echo);
		};
	};

	self.string = (field) => {
		return (value) => {
			return ![
				isMissingWhenRequired(field, value),
				!isUndefined(value) &&
					(self.isPOJO(value) ||
					Array.isArray(value) ||
					typeof value.toString === 'undefined')
			].some(echo);
		};
	};

	return self;
}({}));
