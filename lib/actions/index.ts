"use server"

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scrapper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";


export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return;

  try {
    connectToDB();
    const scrapedProduct = await scrapeAmazonProduct(productUrl);
    if (!scrapedProduct) return;

    let product = scrapedProduct;
    const existingProduct = await Product.findOne({ url: scrapedProduct.url });

    if (existingProduct) {
      const updatedPriceHistory = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ]

      product = { 
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      }
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url }, 
      product, 
      { upsert: true, new: true }
    );
    
    // console.log(newProduct);
    revalidatePath(`/product/${newProduct._id}`);

  } catch (error) {
    throw new Error(`Failed to create/update product: ${error}`)
  }
}

export async function getProductById(productId: string) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return;

    return product;
  } catch (error) {
    throw new Error(`Failed to get the product of id[${productId}]: ${error}`)
  }
}

export async function getAllProducts() {
  try {
    connectToDB();

    const products = await Product.find();
    
    if (!products) return;
    
    return products;
  } catch (error) {
    throw new Error(`Failed to get all the products: ${error} `);
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    connectToDB();

    const currentProduct = await Product.findById(productId);
    
    if (!currentProduct) return null;

    const similarProducts = await Product.find({
      _id: { $ne: productId },
    }).limit(3);
    
    return similarProducts;
  } catch (error) {
    throw new Error(`Failed to get all the products: ${error} `);
  }
}

export async function addUserEmailToProduct(productId: string, userEmail: string) {
  // console.log("Email addUserEmailToProduct is successful")
  try {
    connectToDB();
    // send our first email...
    const product = await Product.findById(productId);
    if (!product) return;
    // console.log("product", product);

    const userExists = product.users.some((user: User) => user.email === userEmail);

    if (!userExists) {
      product.users.push({ email: userEmail });

      await product.save();
      const emailContent = generateEmailBody(product, "WELCOME");
      await sendEmail(emailContent, [userEmail]);
    }

  } catch (error) {
    console.error("Error during subscribing email: ", error);
  }
}