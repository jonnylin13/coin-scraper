'use strict';

const scrape = require('website-scraper');
const rimraf = require('rimraf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();
const nodemailer = require('nodemailer');

const sources = [
    {name: 'Bitcoin', selector: 'a[href="/assets/btc/usd/chart"] > div > span'},
    {name: 'Ethereum', selector: 'a[href="/assets/eth/usd/chart"] > div > span'},
    {name: 'Litecoin', selector: 'a[href="/assets/ltc/usd/chart"] > div > span'},
    {name: 'Bitcoin Cash', selector: 'a[href="/assets/bch/usd/chart"] > div > span'},
];
const options = {
    urls: ['https://cryptowat.ch/'],
    directory: process.env.SCRAPE_PATH,
    sources: sources
};

async function send_email(urgent=false) {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    let html_body = '';

    for (let coin of sources) {
        html_body += `<h1>${coin.name}</h1>`;
        if (coin.pct.includes('-')) {
            html_body += `<h2>is at <span style="color:red;">$${coin.price}</span> | <span style="color:red;">${coin.pct}</span><br>`;
        } else {
            html_body += `<h2>is at <span style="color:green;">$${coin.price}</span> | <span style="color:green;">${coin.pct}</span><br>`;
        }
    }

    html_body += '<p style="font-weight: bold;">Scraped from https://cryptowat.ch/</p>';
    let subject = `Bitcoin is at $${sources[0].price} | ${sources[0].pct}`;
    if (urgent) subject = 'URGENT | ' + subject;
    

    let info = await transporter.sendMail({
        from: `"Cryptoknight 👨‍🦲" <${process.env.SMTP_USER}>`,
        to: process.env.TARGET_EMAIL,
        subject: subject,
        html: html_body
    });
}

function should_email() {

    if (process.argv[2] === 'email') return true;
    return false;
    // Check history

}

function save_records() {
    for (let coin of sources) {
        let csvWriter = createCsvWriter({
            path: `data/${coin.name}.csv`,
            header: [
                {id: 'date', title: 'date'},
                {id: 'price', title: 'price'},
                {id: 'pct', title: 'pct'}
            ],
            append: true
        });
        let date = new Date(Date.now());
        let record = {
            date: date.toUTCString(),
            price: coin.price,
            pct: coin.pct
        };
        csvWriter.writeRecords([record]).then(res => {}).catch(err => {console.error(err)});
    }
}

scrape(options).then(res => {

    for (let coin of sources) {
        switch(coin.name) {
            case 'Bitcoin':
                coin.price = res[0].children[0].filename;
                coin.pct = res[0].children[1].filename;
                break;
            case 'Ethereum':
                coin.price = res[0].children[3].filename;
                coin.pct = res[0].children[4].filename;
                break;
            case 'Litecoin':
                coin.price = res[0].children[6].filename;
                coin.pct = res[0].children[7].filename;
                break;
            case 'Bitcoin Cash':
                coin.price = res[0].children[9].filename;
                coin.pct = res[0].children[10].filename;
                break;
            default:
                break;
        }
        console.log(`${coin.name} is at ${coin.price} | ${coin.pct}`);
    }

    save_records();

    if (should_email()) {
        send_email().then(res =>{}).catch(err => { console.error(err); rimraf(process.env.SCRAPE_PATH, (err) => {if(err) console.error(err)}) });
    }

    rimraf(process.env.SCRAPE_PATH, (err) => {if (err) console.error(err)});

}).catch(err => {
    console.error(err);
    rimraf(process.env.SCRAPE_PATH, (err) => {if (err) console.error(err)});
});
