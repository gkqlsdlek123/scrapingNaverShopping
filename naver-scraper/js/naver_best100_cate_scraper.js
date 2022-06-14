/*
 * Naver Best100 Category Scraper
 *
 *
 * @author
 * @modified 2018-08-28
 * @lastModified 2018-08-28
 */
const request = require('request');
// parses markup and provides an API for traversing/manipulating the resulting data structure
const cheerio = require('cheerio');
// file system
const fs = require('fs');

// const scrapTargetUrl = 'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000004';
const best100ListElementId = '#productListArea';

async function launch (scrapTargetUrl) {
	let resultDataArr = null;
	try {
		/*
			01. [http] Writing File
					[Cheerio] HTML to Jquery Object
		*/
		resultDataArr = await getContents(scrapTargetUrl);
	} catch (err) {
		console.error(err);
	} finally {
		return resultDataArr;
	}
}

/**
 *	Extract Best100 Html Contents
 *		[http] Writing File
 *		[Cheerio] HTML to Jquery Object
 */
async function getContents(scrapTargetUrl) {
	return new Promise(function(resolve, reject) {
		request.get({url: scrapTargetUrl}, async function(err, response, body) {
			if (err) {
				reject(err);
			} else {
				/*
					[Cheerio] HTML to Jquery Object
				*/
				let contentsData = cheerio.load(body, {
					decodeEntities: false
				});
				/*
					[Javascript]
				*/
				let resultDataArr = await mainContentsExtraction(contentsData);
				resolve(resultDataArr);
			}
		});
	});
}
/**
 * Main Contents Extraction
 *
 */
async function mainContentsExtraction(contentsData) {
	let resultDataArr = [];
	try{
		const $ = contentsData;
		$('#productListArea li').each(function(i, elem) {
			let dataObj = {};
			let itemName = $(this).find('.cont a').attr('title');
			let price = $(this).find('.price .num').text();
			let contentsLink = $(this).find('.cont a').attr('href');
			let thumbLink = $(this).find('.thumb_area img').data('original');
			dataObj.itemName = itemName;
			dataObj.price = price;
			dataObj.contentsLink = contentsLink;
			dataObj.thumbLink = thumbLink;
			resultDataArr.push(dataObj);
		});
	} catch (err) {
		console.error(err);
	 } finally {
	 	return resultDataArr;
	}
}

module.exports.launch = launch;
