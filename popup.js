document.addEventListener("DOMContentLoaded", function() {
	console.log("DOM loaded");

	const smth = {
		closest_label: "",
		closest_legend: "",
		closest_p: "",
		closest_span: "",
		closest_div: "",
		closest_h1: "",
		closest_h2: "",
		closest_h3: "",
		closest_h4: "",
		closest_h5: "",
		closest_h6: "",
		closest_small: "",
		closest_em: "",
		closest_strong: "",
		closest_li: "",
		closest_td: "",
		closest_th: "",
		closest_caption: "",
		closest_section: "",
		closest_article: "",
		closest_section: "",
		closest_aside: "",
		closest_output: "",
		closest_figcaption: ""
	};

	let infoPointer = 0;
	let infoArray = [
		`
			<fieldset>
				<label>First Name: </label>
				<input id="first_name" type="text">
				<label>Middle Name: </label>
				<input id="middle_name" type="text">
				<label>Last Name: </label>
				<input id="last_name" type="text">
			</fieldset>
		`,
		`
			<fieldset>
				<label>Username: </label>
				<input id="username" type="text">
				<label>Email: </label>
				<input id="email" type="text">
				<label>Password: </label>
				<input id="password" type="text">
				<label>Phone No: </label>
				<input id="phone_number" type="text">
				<label>Tel. Country Code:</label>
				<input id="tel_country_code" type="text">
			</fieldset>
		`,
		`
			<fieldset>
				<label>Address: </label>
				<input id="street_address" type="text">
				<label>Postal Code: </label>
				<input id="postal_code" type="text">
				<label>City: </label>
				<input id="city" type="text">
				<label>Province:</label>
				<input id="province" type="text">
				<label>Country</label>
				<input id="country" type="text">
			</fieldset>
		`
	];

	// show starting info
	(async () => {
		document.getElementById("info-form").innerHTML = infoArray[infoPointer];
		await loadInfo();
		saveInfo();
	})();

	// save personal info
	function saveInfo() {
		document.querySelectorAll("input").forEach(el => {
			el.addEventListener("input", async function() {
				const id = el.getAttribute("id");
				const value = el.value;
				await chrome.storage.local.set({[id]: value});
			});
		});
	}

	// load personal info
	async function loadInfo() {
		document.querySelectorAll("input").forEach(async function(el) {
			const id = el.getAttribute("id");
			const value = await chrome.storage.local.get(id);
			el.value = value[id] || "";
		});
	}

	// change the displayed html with the arrows
	document.getElementById("left-arrow").addEventListener("click", async function() {
		infoPointer = (infoPointer + 2) % 3;
		document.getElementById("info-form").innerHTML = infoArray[infoPointer];

		await loadInfo();

		// save personal info constantly
		saveInfo();
	});

	document.getElementById("right-arrow").addEventListener("click", async function() {
		infoPointer = (infoPointer + 1) % 3;
		document.getElementById("info-form").innerHTML = infoArray[infoPointer];

		await loadInfo();

		// save personal info constantly
		saveInfo();
	});


	// capture the input elements
	document.getElementById("capture").addEventListener("click", function() {
		console.log("Capture button clicked");

		// get inputs
		chrome.tabs.query({active: true, currentWindow: true}, async function (tabs) {

			let inputs;
			
			async function captureInputFields() {
				return new Promise(resolve => {
					chrome.tabs.sendMessage(tabs[0].id, {action: "readInputs"}, (response) => {
						resolve(response);
					})
				});
			}

			inputs = await captureInputFields();
			inputs = inputs.data;


			// prompt the ai
			const labels = ["first_name", "middle_name", "last_name", "phone_number", "email", "password", "phone_number", "tel_country_code", "street_address", "postal_code", "city", "province", "country", "username"]


			/*
			const prompt = JSON.stringify(inputs, null, 2);
			const response = await fetch("http://localhost:5000/classify", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					inputs: inputs,
					labels: labels
				})
			});
			*/

			const prompt = `Given a list of Objects where each object represents a HTML element, use the attributes of the element to classify the context of the element. Your classification should be one of the following ${JSON.stringify(labels, null, 2)}. Use 'unknown' if you are not sure of the classification.
			Here is the list of Objects ${JSON.stringify(inputs, null, 2)}. Return a list of your classifications in the same order as the inputs with no additional text. It is possible to have an empty list.`;
			console.log(prompt);

			const response =  await fetch("http://localhost:11434/api/generate", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					model: "deepseek-r1:8b",
					prompt: prompt,
					stream: false
				})
			});


			if (!response.ok) {
				console.log("Response not okay");
				return;
			}

			const result = await response.json();

			try {
				const input = result.response;

				console.log(input);
				
				const match = input.match(/<\/think>([\s\S]*)/);
				console.log(match);
				console.log(match[1]);

				const classifications = match ? JSON.parse(match[1].trim()): [];

				console.log(classifications);

				// send message to content script to fill info
				await chrome.tabs.sendMessage(tabs[0].id, {action: "writeInputs", inputs: inputs, classifications: classifications});

				console.log("Done");

			} catch (error) {
				console.error("Something went wrong ", error);
			}
		});
	});
});

