const saveBtn = document.getElementById('input-btn');
const userInput = document.getElementById('input-el');
const savedData = localStorage.getItem('userData');
const deleteEl = document.getElementById('delete');
const tabEl = document.getElementById('tab-btn');
const saveGroupsBtn = document.getElementById('save-groups');
const ulEl = document.getElementById('ulElm');
let userText = [];
let repeat = 0;
if (savedData) {
	userText = JSON.parse(savedData);
	userText.reverse().forEach((element) => {
		addTabToList(element);
	});
}

saveBtn.addEventListener('click', () => {
	repeat = generateLead();
	if (!repeat) {
		addTabToList(userInput);
	}
});

window.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		repeat = generateLead();
		if (!repeat) {
			addTabToList(userInput);
		}
	}
});

function generateLead() {
	repeat = validateLead(userInput.value);
	if (repeat) {
		return 1;
	}
	userText.unshift(userInput.value.trim());
	localStorage.setItem('userData', JSON.stringify(userText));
}

function addTabToList(userInputValue) {
	const liEl = document.createElement('li');
	const btnEl = document.createElement('button');
	btnEl.textContent = 'X';
	btnEl.id = 'delete-item-btn';
	let titleSet = false;

	async function createGroupLinks(userInputValue) {
		try {
			await Promise.all(
				userInputValue.map(async (group) => {
					for (const tabUrl of group.groupActiveTabs) {
						const aEl = document.createElement('a');
						aEl.href = tabUrl;
						aEl.className = 'groupLinkEl';
						aEl.style.color = group.groupColor;
						if (!titleSet) {
							aEl.textContent = group.groupName + ' (Group)';
							titleSet = true;
						}
						// Add event listener to open all URLs when the link is clicked
						aEl.addEventListener('click', async (event) => {
							event.preventDefault(); // Prevent the default link behavior
							// Open each URL in a new tab
							for (const url of group.groupActiveTabs) {
								await chrome.tabs.create({ url });
							}
						});
						liEl.appendChild(aEl);
						liEl.appendChild(btnEl);
					}
				})
			);
		} catch (error) {
			const aEl = document.createElement('a');
			aEl.className = 'linkEl';
			aEl.href = userInputValue.value === undefined ? userInputValue : userInputValue.value;
			aEl.target = '_blank';
			aEl.textContent = userInputValue.value === undefined ? userInputValue : userInputValue.value;
			if (aEl.textContent === userInputValue && userInputValue.length > 100) {
				console.log('hey')
				aEl.textContent = extractDomain(userInputValue)
			}
			liEl.appendChild(aEl);
			liEl.appendChild(btnEl);
		} finally {
			const firstListItem = ulEl.firstChild;
			ulEl.insertBefore(liEl, firstListItem);
			let name;
			btnEl.addEventListener('click', () => {
				deleteListElement(name, liEl);
			});
		}
	}

	// Call the function passing userInputValue as an argument
	createGroupLinks(userInputValue);
}
function extractDomain(url) {
	const { hostname } = new URL(url);
	return hostname;
  }

function deleteListElement(name, liEl) {
	let link = liEl.querySelectorAll('.linkEl');

	// If there are no elements with class 'linkEl', try querying with class 'groupLinkEl'
	if (link.length === 0) {
		link = liEl.querySelectorAll('.groupLinkEl');
		for (const li of link) {
			if (name) {
				break;
			} else {
				[name, ...rest] = li.textContent.split(' (');
			}
		}

		let match = null;
		let index = 0;

		for (const data of userText) {
			match = data[0].groupName === name ? true : false;
			if (match) {
				name = data[0].groupName;
				break;
			}
			index++;
		}

		liEl.remove();
		userText.splice(index, 1);
		localStorage.setItem('userData', JSON.stringify(userText));
	} else {
		name = link[0].textContent;
		const index = userText.indexOf(name);
		liEl.remove();
		userText.splice(index, 1);
		localStorage.setItem('userData', JSON.stringify(userText));
	}
}

tabEl.addEventListener('click', () => {
	getTab();
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Tab') getTab();
});

function getTab() {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		if (tabs.length > 0) {
			const tabUrl = tabs[0].url;
			repeat = validateLead(tabUrl);
			if (!repeat) {
				userText.unshift(tabUrl);
				addTabToList(userText[0]);
				localStorage.setItem('userData', JSON.stringify(userText));
			} else {
				console.log('Already Saved or Empty Input Field')
			}
		}
	});
}

function validateLead(userInputValue) {
	if (userText.includes(userInputValue.trim()) || userInputValue === '') return 1;
	else return 0;
}

function validateTabGroup(groupName) {
	console.log(userText)
	return userText.some((element) => {
		if (Array.isArray(element)) {
			console.log(groupName.title)
			console.log(element[0].groupName)
			return element[0].groupName === groupName.title;
		}
		return false;
	});
}

deleteEl.addEventListener('click', () => {
	localStorage.clear();
	userText = [];
	ulEl.innerHTML = '';
});

saveGroupsBtn.addEventListener('click', () => {
	createGroup();
});

async function createGroup() {
	async function getTabsInTabGroup(tabGroup) {
		return new Promise((resolve, reject) => {
			chrome.tabs.query({ groupId: tabGroup.id }, (tabs) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					let tabsInGroup = [];
					for (const tab of tabs) {
						tabsInGroup.push(tab.url);
					}
					resolve(tabsInGroup);
				}
			});
		});
	}

	function processTabGroups(tabGroups) {
		return new Promise((resolve, reject) => {
			if (tabGroups.length > 0) {
				resolve(tabGroups);
			} else {
				reject('No Tab Groups Open');
			}
		});
	}

	try {
		const tabGroups = await new Promise((resolve, reject) => {
			chrome.tabGroups.query({}, (tabGroups) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					resolve(tabGroups);
				}
			});
		});

		const validTabGroups = await processTabGroups(tabGroups);

		for (let tabGroup of validTabGroups) {
			repeat = 0;
			if (tabGroup.title === '') {
				console.log('Saved as Untitled');
				tabGroup.title = 'Untitled Group';
			}
			const tabs = await getTabsInTabGroup(tabGroup);
			console.log(repeat);
			console.log(tabGroup.title);
			if (!repeat) {
				repeat = printTabGroup(tabGroup, tabs);
			} else {
				console.log('Tab group already exists');
			}
		}
	} catch (error) {
		if (error === 'No Tab Groups Open') {
			alert(error);
		} else {
			console.error('Error querying tabs:', error.message);
		}
	}
}

function printTabGroup(tabGroup, tabsFromGroup) {
	const groupSaveInformation = [
		{ groupName: tabGroup.title, groupActiveTabs: tabsFromGroup, groupColor: tabGroup.color }
	];
	repeat = validateTabGroup(tabGroup);

	if (!repeat) {
		console.log('bypassed validate')
		console.log(tabGroup.title)
		const liEl = document.createElement('li');
		const btnEl = document.createElement('button');
		btnEl.textContent = 'X';
		btnEl.id = 'delete-item-btn';

		let titleSet = false;
		// Loop through each tab's URL in the tab group
		tabsFromGroup.forEach((tabUrl) => {
			const aEl = document.createElement('a');
			aEl.className = 'groupLinkEl';
			aEl.href = tabUrl;
			aEl.style.color = tabGroup.color;

			if (!titleSet) {
				aEl.textContent = tabGroup.title + ' (Group)';
				titleSet = true;
			}

			// Add event listener to open all URLs when the link is clicked
			aEl.addEventListener('click', (event) => {
				event.preventDefault(); // Prevent the default link behavior

				// Open each URL in a new tab
				tabsFromGroup.forEach((url) => {
					chrome.tabs.create({ url });
				});
			});
			liEl.appendChild(aEl);
			liEl.appendChild(btnEl);
		});
		liEl.style.color = tabGroup.color;
		userText.unshift(groupSaveInformation);
		localStorage.setItem('userData', JSON.stringify(userText));

		console.log(userText);
		const ulEl = document.getElementById('ulElm');
		const firstListItem = ulEl.firstChild;
		ulEl.insertBefore(liEl, firstListItem);
		let name;
		btnEl.addEventListener('click', () => {
			deleteListElement(name, liEl);
		});
	} else {
		return 1;
	}
}
