'use strict';

const scrape = require('website-scraper');
const rimraf = require('rimraf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();
const nodemailer = require('nodemailer');

const options = {
    urls: ['https://cryptowat.ch/'],
    directory: process.env.SCRAPE_PATH,
    sources: [{
        selector: 'a[href="/assets/btc/usd/chart"] > div > span'
    }]
};

async function send_email(price, pct) {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    let info = await transporter.sendMail({
        from: `"Cryptoknight 👨‍🦲" <${process.env.SMTP_USER}>`,
        to: process.env.TARGET_EMAIL,
        subject: `Bitcoin is at ${price} | ${pct}`,
        text: `Bitcoin is at ${price} | ${pct}!\nhttps://cryptowat.ch/`
    });
}

scrape(options).then(res => {

    let price = res[0].children[0].filename;
    let pct = res[0].children[1].filename
    let csvWriter = createCsvWriter({
        path: 'data/bitcoin.csv',
        header: [
            {id: 'date', title: 'date'},
            {id: 'price', title: 'price'}
        ],
        append: true
    });

    let date = new Date(Date.now());
    let record = {
        date: date.toUTCString(),
        price: price
    };
    csvWriter.writeRecords([record]).then(res => {}).catch(err => {});

    send_email(price, pct);
    rimraf(process.env.SCRAPE_PATH, (err) => {});

}).catch(err => {
    console.log(err);
});
