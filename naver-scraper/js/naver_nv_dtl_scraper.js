/*
 * Naver Nv Detail Scraper
 *
 * Copyright (c) 2018 CJ ENM
 *
 * @author <juho.koh@cj.net>
 * @modified 김하빈 <habin_kim@cj.net> 2018-10-10
 * @lastModified 김하빈 <habin_kim@cj.net> 2018-10-10
 */
// provides a high-level API to control Chrome or Chromium over the DevTools Protocol
// requires at least Node v6.4.0, but the examples below use async/await which is only supported in Node v7.6.0 or greater
const puppeteer = require('puppeteer');
// parses markup and provides an API for traversing/manipulating the resulting data structure
const cheerio = require('cheerio');
// file system
const fs = require('fs');
const dateFormat = require('dateformat');

const titleIdx = 0;
const naverPageSetCnt = 10;
const naverPageItemSetCnt = 20;

//const scrapTargetUrl = 'https://search.shopping.naver.com/detail/detail.nhn?nv_mid=5401885648&cat_id=50000313';
const priceListElementId = '#section_price_list';
const itemNameElementClassId = '.h_area';

async function launch (scrapTargetUrl, contentsLoadDelay) {
	var resultObj = {
		success : true,
		msg : 'success',
		resultData : ''
	};
	try {
		/*
			01. [Puppeteer] Browser Init
		*/
		//let browser = await puppeteer.launch({headless:false});
		let browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
		/* 
			02. [Puppeteer] New Browser
		*/
		let page = await browser.newPage();
		page.setViewport( { width: 1280, height: 800} );
		/*
			03. [Puppeteer] Go Url
		*/
		await page.goto(scrapTargetUrl, {waitUntil: 'domcontentloaded'});
		// add delay
		await page.waitFor(contentsLoadDelay);
		/*
			04. [Puppeteer] 상품명 영역 Scraping
		*/
		let contentsHtml = await page.evaluate((sel) => {
			return $(sel).html();
		}, itemNameElementClassId);
		/*
			05. [Cheerio] 상품명 영역 HTML to Jquery Object
		*/
		let contentsData = await cheerio.load(contentsHtml, {
			decodeEntities: false
		});
		let resultData = '';
		let pageIdx = await 0;
		let pageSetIdx = await 0;

		/*
			05-1. [Cheerio] 카테고리 영역 HTML to Jquery Object
		*/
		let categoryDepthHtml = await page.evaluate((sel) => {
			return $(sel).html();
		}, ".search_breadcrumb");
		let categoryDepthArr = categoryDepthHtml.trim().split("</span>");
		let cateDepth = new Array();
		if(categoryDepthArr.length > 3 && categoryDepthArr[3].length > 0) {
			let cateHtml_4 = await cheerio.load(categoryDepthArr[3], {
				decodeEntities: false
			})
			cateDepth[3] = cateHtml_4('a').html().trim();
		}
		if(categoryDepthArr.length > 2 && categoryDepthArr[2].length > 0) {
			let cateHtml_3 = await cheerio.load(categoryDepthArr[2], {
				decodeEntities: false
			})
			cateDepth[2] = cateHtml_3('a').html().trim();
		}
		if(categoryDepthArr.length > 1 && categoryDepthArr[1].length > 0) {
			let cateHtml_2 = await cheerio.load(categoryDepthArr[1], {
				decodeEntities: false
			})
			cateDepth[1] = cateHtml_2('a').html().trim();
		}
		if(categoryDepthArr.length > 0 && categoryDepthArr[0].length > 0) {
			let cateHtml_1 = await cheerio.load(categoryDepthArr[0], {
				decodeEntities: false
			})
			cateDepth[0] = cateHtml_1('a').html().trim();
		}
		/*
			06. [Jquery] 상품명 가져오기
		*/
		let itemName = '';
		itemName = contentsData('h2').html().trim();
		let exceptTagName = '</span>';
		let exceptTagIndex = (itemName.indexOf(exceptTagName));
		//h2 태그 내 잔여 태그 존재 시
		if(exceptTagIndex != -1) {
			itemName = itemName.substring(itemName.lastIndexOf('>')+1, itemName.length);
		}
		/*
			07. 현재 페이지 URL 및 nv_mid값 가져오기
		*/
		let nowPageUrl = '';
		let nowPageNvMid = '';
		nowPageUrl = page.url().substring(0, page.url().indexOf('&NaPm'));
		nowPageNvMid = nowPageUrl.substring(nowPageUrl.indexOf('&nv_mid')+8, nowPageUrl.length);
		while(true) {
			//console.log('pageIdx : ',pageIdx);
			try {
				let currentPageIdx = 0;
				/*
					08. [Puppeteer] 판매처별 가격 리스트 영역 Scraping
				*/
				let clickedContentsHtml = await page.evaluate((sel) => {
					return $(sel).html();
				}, priceListElementId);
				/*
					09. [Cheerio] 판매처별 가격 리스트 영역 HTML to Jquery Object
				*/
				let clickedContentsData = await cheerio.load(clickedContentsHtml, {
						decodeEntities: false
				});
				/*
					10. [Javascript] 파일에 쓸 중요 데이터 부분만 추출
				*/
				let resultClickedDataArr = await mainContentsExtraction(clickedContentsData, pageIdx, itemName, nowPageUrl, nowPageNvMid, cateDepth);
				resultData += await resultClickedDataArr.join('\n');
				resultData += '\n';
				
				/*
					11. [Logging] 페이지 데이터 추출 및 로깅
				*/
				let $ = await clickedContentsData;
				// set page contents
				let clickablePageArr = await $('#_price_list_paging a').map(function() {
					return $(this).text().toString() || undefined;
				}).get();
				/*
					12. [Javascript] 현재 페이지 인덱스 계산
				*/
				if (pageSetIdx > 0) {
					currentPageIdx = await pageIdx+(-11*pageSetIdx)+4+pageSetIdx;
				} else {
					currentPageIdx = await pageIdx+(-11*pageSetIdx)+2+pageSetIdx;
				}
				if (pageIdx == (pageSetIdx*10)+(pageSetIdx+10)-pageSetIdx) {
					await pageSetIdx++;
				}
				if (pageSetIdx > 0) {
					// second page set 처음 이전 추가됨으로 추가 +2
					currentPageIdx = await pageIdx+(-11*pageSetIdx)+4+pageSetIdx;
				} else {
					currentPageIdx = await pageIdx+(-11*pageSetIdx)+2+pageSetIdx;
				}
				/*
					etc. [Javascript] Scraping Stop
						- 클릭할 페이지 숫자도 없고, "다음" 도 없을 경우 
				*/
				if($('#_price_list_paging a:nth-child('+currentPageIdx+')').html() == null) {
					break;
				}
				/*
					13. [Puppeteer] 다음 페이지 클릭
				*/
				await page.click('#_price_list_paging a:nth-child('+currentPageIdx+')', {waitUntil: 'domcontentloaded'}).then(async function(){
					// add delay
					await page.waitFor(contentsLoadDelay);
					//await page.waitForNavigation({waitUntil: 'domcontentloaded'});
					await pageIdx++;
				});
				
			} catch (err) {
				await page.close();
				await browser.close();
				await errHandle(err, resultObj);
				break;
			}
		}
	/*
		14. [fs] Finish
	*/
		await page.close();
		await browser.close();
		resultObj.resultData = resultData;
	} catch (err) {
		await errHandle(err, resultObj);
	} finally {
		return resultObj;
	}
}

/**
 * 판매처별 가격 리스트 영역에서 중요 데이터 추출
 *
 */
async function mainContentsExtraction(contentsData, pageIdx, itemName, nowPageUrl, nowPageNvMid, cateDepth) {
	try {
		const $ = contentsData;
		let resultDataArr = [];
		$('table').each(function(i, elem) {
			if (i === titleIdx) {
				return; // title bypass
			}
			let dataStrArr = [];
			let mallLogoAnchorTagEle = $(this).find('._priceListMallLogo');
			let priceTdTagEle = $(this).find('.td_price');
			let productTrTagEle = $(this).find('tr');
			let delyPriceTdTagEle = $(priceTdTagEle).next();
			let shoppingDtlTdTagEle = $(delyPriceTdTagEle).next();
			
			dataStrArr.push(dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss.L')); // current time
			dataStrArr.push(itemName); // item name
			dataStrArr.push((pageIdx*20)+i); // seq
			dataStrArr.push($(mallLogoAnchorTagEle).data('mall-name')); // mall name
			dataStrArr.push($(priceTdTagEle).find('span').first().text().replace(/[^a-zA-Z0-9]/g,'')); // price
			dataStrArr.push($(delyPriceTdTagEle).find('p').text().replace(/[^a-zA-Z0-9]/g,'')); // delivery price
			let shoppingDtlStr = $(shoppingDtlTdTagEle).find('p').map(function() {
				return $(this).text() || undefined;
			}).get();
			shoppingDtlStr = shoppingDtlStr.join(',');
			dataStrArr.push(shoppingDtlStr); // description
			dataStrArr.push($(productTrTagEle).data('mall-pid')); // item code
			dataStrArr.push(nowPageUrl);
			dataStrArr.push(nowPageNvMid);
			dataStrArr.push(cateDepth[0]);
			dataStrArr.push(cateDepth[1]);
			dataStrArr.push(cateDepth[2]);
			dataStrArr.push(cateDepth[3]);
			dataStrArr.push('');
			dataStrArr = dataStrArr.join('|');

			resultDataArr.push(dataStrArr);
		});
		return resultDataArr;
	} catch (err) {
		console.error(err);
	}
}

async function errHandle (err, resultObj) {
	console.error(err);
	resultObj.success = await false;
	//resultObj.resultData = await err.toString();
}

module.exports = console;
module.exports.launch = launch;