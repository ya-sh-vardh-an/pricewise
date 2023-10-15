'use client'
import { scrapeAndStoreProduct } from '@/lib/actions';
import React, { FormEvent, useState } from 'react'

const isValidAmazonProductURL = (url: string) => {

  try {
    const parsedURL = new URL(url);
    const hostname = parsedURL.hostname;

    if (
      hostname.includes('amazon.com') || 
      hostname.includes('amazon.') || 
      hostname.endsWith('amazon')) {
        return true;
      }
    // check if hostname contains amazon.com or amazon.<<something>>
  } catch (error) {
    return false;
  }

  return false;

} 

const SearchBar = () => {

  const [searchPrompt, setSearchPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValidLink = isValidAmazonProductURL(searchPrompt);

    if (!isValidLink) return alert('Please provide a valid Amazon link!')

    try {
      setIsLoading(true);

      // Srape our first product page
      const product = await scrapeAndStoreProduct(searchPrompt);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }


  }
  return (
    <form className='flex flex-wrap gap-4 mt-12' onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder='Enter product link' 
        className='searchbar-input' 
        value={searchPrompt} 
        onChange={(e) => setSearchPrompt(e.target.value)} 
      />
      <button 
        type='submit' 
        className='searchbar-btn'
        disabled={searchPrompt === ''}
      >
          {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}

export default SearchBar