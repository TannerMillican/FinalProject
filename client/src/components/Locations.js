import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/core/styles';
import parse from 'autosuggest-highlight/parse';
import throttle from 'lodash/throttle';

function loadScript(src, position, id) {
	if (!position) {
		return;
	}

	const script = document.createElement('script');
	script.setAttribute('async', '');
	script.setAttribute('id', id);
	script.src = src;
	position.appendChild(script);
}

const autocompleteService = {current: null};
let sessionToken;

const useStyles = makeStyles((theme) => ({
	icon: {
		color: theme.palette.text.secondary,
		marginRight: theme.spacing(2),
	},
	searchBox: {
		fontWeight: '500',
		fontStyle: 'oblique',
		margin: '0 auto',
		color: 'white',
	},
}));

export default function MapsSearch() {
	const classes = useStyles();
	const [value, setValue] = React.useState(null);
	const [inputValue, setInputValue] = React.useState('');
	const [options, setOptions] = React.useState([]);
	const loaded = React.useRef(false);

	if (typeof window !== 'undefined' && !loaded.current) {
		if (!document.querySelector('#google-maps')) {
			loadScript(`https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places`, document.querySelector('head'), 'google-maps');
		}

		loaded.current = true;
	}
	if (!sessionToken && window.google) {
		sessionToken = new window.google.maps.places.AutocompleteSessionToken();
		console.log('hey testing', sessionToken);
	}
	const fetch = React.useMemo(
		() =>
			throttle((request, callback) => {
				autocompleteService.current.getPlacePredictions(request, callback);
			}, 200),
		[]
	);

	React.useEffect(() => {
		let active = true;

		if (!autocompleteService.current && window.google) {
			autocompleteService.current = new window.google.maps.places.AutocompleteService();
		}
		if (!autocompleteService.current) {
			return undefined;
		}

		if (inputValue === '') {
			setOptions(value ? [value] : []);
			return undefined;
		}

		fetch({input: inputValue, sessionToken: sessionToken}, (results) => {
			if (active) {
				let newOptions = [];

				if (value) {
					newOptions = [value];
				}

				if (results) {
					newOptions = [...newOptions, ...results];
				}

				setOptions(newOptions);
			}
		});

		return () => {
			active = false;
		};
	}, [value, inputValue, fetch]);

	return (
		<Autocomplete
			id="google-map-demo"
			style={{width: 300}}
			getOptionLabel={(option) => (typeof option === 'string' ? option : option.description)}
			filterOptions={(x) => x}
			options={options}
			autoComplete
			includeInputInList
			filterSelectedOptions
			value={value}
			onChange={(event, newValue) => {
				setOptions(newValue ? [newValue, ...options] : options);
				setValue(newValue);
			}}
			onInputChange={(event, newInputValue) => {
				setInputValue(newInputValue);
			}}
			renderInput={(params) => <TextField {...params} className={classes.searchBox} label="Add a location" style={{backgroundColor: 'white', opacity: '0.7'}} variant="filled" fullWidth />}
			renderOption={(option) => {
				const matches = option.structured_formatting.main_text_matched_substrings;
				const parts = parse(
					option.structured_formatting.main_text,
					matches.map((match) => [match.offset, match.offset + match.length])
				);

				return (
					<Grid container alignItems="center">
						<Grid item>
							<LocationOnIcon className={classes.icon} />
						</Grid>
						<Grid item xs>
							{parts.map((part, index) => (
								<span key={index} style={{fontWeight: part.highlight ? 700 : 400}}>
									{part.text}
								</span>
							))}

							<Typography variant="body2" color="textSecondary">
								{option.structured_formatting.secondary_text}
							</Typography>
						</Grid>
					</Grid>
				);
			}}
		/>
	);
}
