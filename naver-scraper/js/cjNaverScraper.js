/*
 * Naver Shopping Best100 Scraper
 *
 *
 * @autho 
 * @modified 2018-08-28
 * @lastModified  2018-08-28
 */
var naverNvDtlScraper = require('./naver_nv_dtl_scraper.js');
var naverBest100Scraper = require('./naver_best100_cate_scraper.js');
// file system
const fs = require('fs'); 

//const best100Category = [fashionCloth,fashionItem,cosmeticsBeauty,digital,furnitureInterior,infantCare,sports,food,health];
const best100Info = [
	{name: '', cateName:'fashionCloth', cateCode:'50000000', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000000'},
	{name: '', cateName:'fashionItem', cateCode:'50000001', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000001'},
	{name: '/', cateName:'cosmeticsBeauty', cateCode:'50000002', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000002'},
	{name: '/', cateName:'digital', cateCode:'50000003', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000003'},
	{name: '/', cateName:'furnitureInterior', cateCode:'50000004', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000004'},
	{name: '/', cateName:'infantCare', cateCode:'50000005', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000005'},
	{name: '/', cateName:'sports', cateCode:'50000007', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000007'},
	{name: '', cateName:'food', cateCode:'50000006', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000006'},
	{name: '/', cateName:'health', cateCode:'50000008', url:'https://search.shopping.naver.com/best100v2/detail.nhn?catId=50000008'}
];

const contentsLoadDelay = [10, 20, 30, 40, 100, 500];
const maxRetryCnt = 6; 
(async () => {
	try { 
		// debug mode
		// let browser = await puppeteer.launch({headless:false});
		console.time('scrapingtime');
		for (var best100InfoIdx in best100Info) {
			try {
				let resultArr = await naverBest100Scraper.launch(best100Info[best100InfoIdx].url);
				for (var best100ItemIdx in resultArr) {
					let nvDtlArr = [];
					let cnt = 0;
					while (cnt < maxRetryCnt) {
						let resultOneArr = [];
						var result = await naverNvDtlScraper.launch(resultArr[best100ItemIdx].contentsLink, contentsLoadDelay[cnt]);
						nvDtlArr.push(result.resultData);
						console.log(result.success, resultArr[best100ItemIdx].contentsLink);
						if (result.success) {
							break;
						}
						await cnt++;
					}
					
					let rootFolderPath = '.././works';
					let folderPath = '.././works/'+best100Info[best100InfoIdx].cateCode;
					fs.existsSync(rootFolderPath) || fs.mkdirSync(rootFolderPath);
					fs.existsSync(folderPath) || fs.mkdirSync(folderPath);
					
					let writeStream = null;
					try {
						writeStream = await fs.createWriteStream(folderPath+'/'+best100Info[best100InfoIdx].cateName+'_'+(parseInt(best100ItemIdx)+1)+'.txt');
						await writeStream.write(nvDtlArr.join('\n'));
						await writeStream.on('finish', async function() {
						});
					} catch (err) {
						console.error(err);	
					} finally {
						await writeStream.end();
					}
				}
				//[#45183] 마지막 카테고리 마지막 파일 생성 안되는 버그
				var lastCategoryWriteSync = await naverNvDtlScraper.launch(resultArr[99].contentsLink, contentsLoadDelay[0]);
			} catch (err) {
				console.error(err);	
			}
		}
	} catch (err) {
		console.error(err);	
	} finally {
		console.timeEnd('scrapingtime');
		process.exit();
	}
})()
