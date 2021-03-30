import express from 'express';
import cors from 'cors';
import qs from 'qs';
import axios from 'axios';
import _ from 'lodash';
import dotenv from 'dotenv';

const app = express();
const hostname = process.env.SERVER_TRANSLATIONS_HOSTNAME;
const port = process.env.SERVER_TRANSLATIONS_PORT;
const apiToken = process.env.SERVER_TRANSLATIONS_API_TOKEN
const apiBaseUrl = process.env.SERVER_TRANSLATIONS_API_BASE_URL

dotenv.config();

app.use(cors());

app.get('/api/v1/translations', async (req, res) => {
	log('--------------')
	log(`Project names: ${req.query.projects}`);
	log(`Language code: ${req.query.languageCode}`);

	const projectNames = req.query.projects.split(',');
	const projectIds = await getProjectIdList(apiToken, projectNames);

	log(`Project ids  : ${projectIds}`)

	const translations = await getTranslations(apiToken, projectIds, req.query.languageCode);

	res.send(translations);
});

app.listen(port, hostname, () => {
	log(`App listening at http://${hostname}:${port}`);
});

const formatData = (terms) => {
	let transObj = {};
	terms.forEach((term) => {
		const objPath = term.context.replace(/"/g, '').split('.');
		objPath.push(term.term);
		const trans = term.translation && term.translation.content.length ? term.translation.content.replace(/"/g, '') : term.term;
		_.set(transObj, objPath, trans);
	});
	return transObj;
};

function getProjectIdList(apiToken, projectNames) {
	if (apiToken && projectNames) {
		const data = qs.stringify({api_token: apiToken});
		const config = {
			method: 'post',
			url: `${apiBaseUrl}/projects/list`,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			data
		};
		return axios(config)
			.then((res) => {
				if (res.data.result) {
					const returnList = [];
					const projects = res.data.result.projects;
					projectNames.forEach((pn) => {
						const project = projects.find((p) => p.name === pn);
						if (project) {
							returnList.push(project.id);
						} else {
							console.warn(`Translation project '${pn}' not found`);
						}
					});
					return returnList;
				}
			});
	} else {
		console.warn('No API token specified / no translation project names specified');
	}
	return [];
}

async function getTranslations(apiToken, projectIds, languageCode) {
	if (apiToken && projectIds) {
		let returnList = {};
		const allPromises = [];
		projectIds.forEach((pId) => {
			const data = qs.stringify({
				api_token: apiToken,
				id: pId,
				language: languageCode,
			});
			const config = {
				method: 'post',
				url: `${apiBaseUrl}/terms/list`,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				data
			};
			console.log(config);

			allPromises.push(axios(config)
				.then((res) => {
					if (res.data.result) {
						let terms = res.data.result.terms;
						terms = terms ? formatData(terms) : [];
						returnList = {...returnList, ...terms};
					}
				}));
		});
		await Promise.all(allPromises);

		return returnList;
	} else {
		console.warn('No API token specified / no translation project ids specified');
	}
}

function log(message) {
	console.info(message);
}
