import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scrapper";
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/utils";
import { NextResponse } from "next/server";

const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
}
// not usable currently!
const THRESHOLD_PERCENTAGE = 40;

export async function GET() {
  try {
    connectToDB();

    const products =  await Product.find({});

    if (!products) throw new Error("Product not found");

    // 1. SCRAPE LATEST PRODUCTv DETAILS & UPDATE DB
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

        if (!scrapedProduct) throw new Error("No product found");

        const updatedPriceHistory = [
          ...currentProduct.priceHistory,
          { price: scrapedProduct.currentPrice },
        ];

        const product = { 
          ...scrapedProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        const newProduct = await Product.findOneAndUpdate(
          { url: scrapedProduct.url }, 
          product, 
          { upsert: true, new: true }
        );

        // 2. CHECK EACH PRODUCT STATUS AND EMAIL PROPERLY
        const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);

        if (emailNotifType && newProduct.users.length > 0) {
          const productInfo = {
            title: newProduct.title, 
            url: newProduct.url,
          }

          const emailContent = generateEmailBody(productInfo, emailNotifType);
          const userEmails = newProduct.users.map((user: any) => user.email);

          await sendEmail(emailContent, userEmails);
        }

        return newProduct;
      })
    )
    
    return NextResponse.json({
      message: 'OK', data: updatedProducts
    })
  } catch (error) {
    throw new Error(`Error in GET: ${error}`);
  }
}