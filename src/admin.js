/*
Generic error logger.
*/
function onError(e) {
  console.error(e);
}

/*
 * get option state
 * 
 */
const setting = { 'initialValue' : false };

function saveOptions() 
{
	let settings = {}
    settings = {
      initialValue: document.getElementById('tabOption').checked  // override show with real data
    }

    browser.storage.sync.set(settings).then(null, onError);
}

function restoreOptions()
{
    browser.storage.sync.get(setting).then(
    (data) => {
      document.getElementById('tabOption').checked = data.initialValue;
    });
}

function getCurrentWindowTab() {
  return browser.tabs.query({active: true, currentWindow: true});
}

document.addEventListener('DOMContentLoaded', function () {
    restoreOptions();    
});

function tabDestination(url, hostname, path) {
	
	if (document.getElementById('tabOption').checked === true)
	{
		browser.tabs.create({'url': url.protocol + '//' + hostname + path });
	} else {
		browser.tabs.update({'url': url.protocol + '//' + hostname + path });
	}
}

document.addEventListener("click", (e) => {

	if(e.target.id === "tabOption")
	{
		saveOptions();
	}

	var myTab = getCurrentWindowTab();
	
	myTab.then(function([currentTab]){

		const url = new URL(currentTab.url);
		const draft = 'stage=Stage';
	 	const live  = 'stage=Live';
	 	const uat = '-uat.';
	 	const prod = '-prod.';
	 	let hostname = url.hostname;
	 	let environment;
		let path;
		let stage;

		if (e.target.id === "admin-run-devbuild") {
			path = '/dev/build';
			tabDestination(url, hostname, path);

	 	} else if (e.target.id === "admin-goto-devtasks") 
	 	{
	 		path = '/dev/tasks';
			tabDestination(url, hostname, path);

	 	} else if (e.target.id === "admin-goto-dev")
	 	{
	 		path = '/dev/';
			tabDestination(url, hostname, path);

	 	} else if (e.target.id === "admin-change-stage") 
	 	{

			if(url.search.length == 0)
			{
				// no stage set, assume user wants to go to Stage
				stage = '?' + draft;	

			} else if(url.search.includes(draft) === true)
			{
				stage = url.search.replace(draft, live);

			} else if(url.search.includes(live) === true)
			{
				stage = url.search.replace(live, draft);
			}

			tabDestination(url, hostname, url.pathname + stage);	

	 	} else if (e.target.id === "admin-change-environment") 
	 	{

			if(url.hostname.includes(prod) === false && url.hostname.includes(uat) === false)
			{
				browser.notifications.create({
				  "type": "basic",
				  "iconUrl": browser.extension.getURL("icons/ssicon-96.png"),
				  "title": '',
				  "message": "Please use only SSP URLs to swap environments."
				});

			} else if(url.hostname.includes(uat) === true )
			{
				environment = url.hostname.replace(uat, prod);
				tabDestination(url, environment, path = url.pathname);

			} else if(url.hostname.includes(prod) === true )
			{
				environment = url.hostname.replace(prod, uat);
				tabDestination(url, environment, path = url.pathname);			
			}
			
		} else if (e.target.id === "admin-flush-cache-page")
		{
			if(url.search.length == 0)
			{
				// no stage set, assume user wants to go to Stage
				stage = '?flush=1';	
				tabDestination(url, hostname, url.pathname + stage);

			} else if(url.search.includes('flush=1') === true)
			{
				browser.tabs.update({'url': url.protocol + '//' + hostname + url.pathname + url.search });
			}

		} else if (e.target.id === "admin-goto-admin") 
		{
			path = '/admin';
			tabDestination(url, hostname, path);
		}

		e.preventDefault();

	}, onError);	

});