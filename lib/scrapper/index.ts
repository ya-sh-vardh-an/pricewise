import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";
import { Data, Product } from "@/types";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // curl --proxy brd.superproxy.io:22225 --proxy-user brd-customer-hl_d92f3ba2-zone-pricewise:snf1ftly21j6 -k https://lumtest.com/myip.json

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: 'brd.superproxy.io',
    port,
    rejectUnauthorized: false,
  }

  try {
    // Fetch product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);
    // console.log("price", $('.priceToPay span.a-price-whole').text().trim())
    // console.log(response);
    
    const title = $('#productTitle').text().trim();
    const currentPrice = extractPrice(
      $('.priceToPay span.a-price-whole'),
      $('a.size.base.a-color-price'),
      $('.a-button-selected .a-color-base'),
      $('.a-price.a-text-price')
    );

    const originalPrice = extractPrice(
      $('#priceblock_ourprice'),
      $('.a-price.a-text-price span.a-offscreen'),
      $('#listPrice'),
      $('.a-size-base.a-color-price'),
    )

    const outOfStock = $('#availability span').text().trim().toLowerCase() !== 'in stock';
    const images = $('#imgBlkFront').attr('data-a-dynamic-image') ||
                  $('#landingImage').attr('data-a-dynamic-image') || 
                  '{}';

    const imageUrls = Object.keys(JSON.parse((images)));
    const currency = extractCurrency($('.a-price-symbol'));
    const discountRate = $('.savingsPercentage').text().replace(/[-%]/g, '');
    const description = extractDescription($);

    // console.log({title, currentPrice, originalPrice, outOfStock, imageUrls, currency, discountRate});
    // Construct data object with scrapped info

    const data : Data = {
      url, 
      currency: currency || 'Rs',
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: 'category',
      reviewsCount: 100,
      stars: 4.5,
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice),
    }

    // console.log(data);
    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape porduct: ${error.message}`);
  }
}