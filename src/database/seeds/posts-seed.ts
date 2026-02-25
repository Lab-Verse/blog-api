import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { Post, PostStatus } from '../../modules/posts/entities/post.entity';
import { dataSourceOptions } from '../../config/database.config';

const dataSource = new DataSource(dataSourceOptions);

// Post titles and content templates for each category type
const postTemplates: Record<string, { titles: string[]; keywords: string }> = {
  // Pakistan
  pakistan: {
    titles: [
      "Latest Developments in Pakistan's Economy",
      "Pakistan's Growing Tech Industry",
      'Cultural Heritage of Pakistan',
      'Tourism Opportunities in Pakistan',
      "Pakistan's International Relations",
      'Infrastructure Development in Pakistan',
      'Education Reforms in Pakistan',
      'Healthcare Initiatives in Pakistan',
      'Sports Achievements in Pakistan',
      'Environmental Conservation in Pakistan',
    ],
    keywords: 'pakistan',
  },
  cpec: {
    titles: [
      'CPEC Progress Update: New Milestones',
      'Economic Impact of CPEC on Pakistan',
      'CPEC Infrastructure Projects Overview',
      'China-Pakistan Economic Corridor: A Success Story',
      'CPEC and Regional Connectivity',
      'Investment Opportunities Under CPEC',
      'CPEC Energy Projects Transform Pakistan',
      'CPEC Industrial Zones Development',
      'CPEC Transportation Network Expansion',
      'Future Prospects of CPEC Partnership',
    ],
    keywords: 'china,pakistan,infrastructure',
  },
  politics: {
    titles: [
      'Political Landscape in 2026',
      'Parliamentary Sessions Highlights',
      'Policy Changes and Their Impact',
      'Political Parties Strategic Moves',
      'Election Preparations Underway',
      'Government Initiatives for Public Welfare',
      "Opposition's Stance on Key Issues",
      'Political Reforms Discussion',
      'Youth in Politics: New Generation Leaders',
      'Democracy Strengthening Measures',
    ],
    keywords: 'politics,government,parliament',
  },
  entertainment: {
    titles: [
      'Top Entertainment News This Week',
      'Celebrity Interviews and Updates',
      'Music Industry Trends 2026',
      'Film Industry Box Office Success',
      'Television Shows Making Waves',
      'Entertainment Awards Season',
      'Behind the Scenes: Making of Blockbusters',
      'Digital Entertainment Revolution',
      'Stand-Up Comedy Scene Growth',
      'Entertainment Industry Economic Impact',
    ],
    keywords: 'entertainment,celebrity,music',
  },
  'climate-solutions': {
    titles: [
      'Innovative Climate Solutions for 2026',
      'Renewable Energy Adoption Progress',
      'Carbon Footprint Reduction Strategies',
      'Climate Action Success Stories',
      'Green Technology Innovations',
      'Sustainable Agriculture Practices',
      'Climate Change Adaptation Measures',
      'Environmental Policy Updates',
      'Community-Led Climate Initiatives',
      'Corporate Sustainability Commitments',
    ],
    keywords: 'climate,environment,green',
  },
  weather: {
    titles: [
      'Weekly Weather Forecast Update',
      'Monsoon Season Preparations',
      'Extreme Weather Events Analysis',
      'Weather Patterns and Agriculture',
      'Climate Monitoring Technology',
      'Weather Safety Tips for Citizens',
      'Seasonal Weather Changes Explained',
      'Weather Impact on Daily Life',
      'Meteorological Department Updates',
      'Understanding Weather Phenomena',
    ],
    keywords: 'weather,sky,clouds',
  },
  articles: {
    titles: [
      'In-Depth Analysis: Current Affairs',
      'Opinion: The Path Forward',
      'Feature Article: Inspiring Stories',
      'Investigative Report: Uncovering Truth',
      'Expert Commentary on Key Issues',
      'Long-Form Article: Society and Change',
      'Editorial: Vision for Tomorrow',
      'Analysis: Economic Trends',
      'Feature: Innovation and Progress',
      'Special Report: Community Impact',
    ],
    keywords: 'article,writing,newspaper',
  },
  // World
  world: {
    titles: [
      'Global News Roundup',
      'International Relations Update',
      'World Economic Forum Highlights',
      'Global Health Initiatives',
      'International Trade Developments',
      'World Leaders Summit Coverage',
      'Global Climate Action Progress',
      'International Security Concerns',
      'World Technology Innovations',
      'Global Cultural Exchange Programs',
    ],
    keywords: 'world,globe,international',
  },
  'uk-news': {
    titles: [
      'UK Parliament Latest Updates',
      'British Economy Performance Report',
      'UK Healthcare System Developments',
      'Education Policy Changes in UK',
      'UK Technology Sector Growth',
      'British Cultural Events Highlights',
      'UK Infrastructure Projects',
      'British Sports Achievements',
      'UK Environmental Initiatives',
      'Brexit Long-Term Impact Analysis',
    ],
    keywords: 'london,uk,british',
  },
  'south-korea': {
    titles: [
      'South Korea Technology Innovation',
      'K-Pop Industry Global Influence',
      'South Korean Economy Trends',
      'Seoul Urban Development',
      'South Korea Education Excellence',
      'Korean Culture Worldwide Spread',
      'South Korea Healthcare Advances',
      'Korean Automotive Industry',
      'South Korea Diplomatic Relations',
      'Korean Entertainment Industry Growth',
    ],
    keywords: 'korea,seoul,korean',
  },
  africa: {
    titles: [
      'African Economic Growth Stories',
      'Technology Revolution in Africa',
      'African Cultural Heritage Preservation',
      'Infrastructure Development Across Africa',
      'African Agriculture Innovation',
      'Healthcare Improvements in Africa',
      'African Wildlife Conservation',
      'Education Initiatives in Africa',
      'African Entrepreneurship Success',
      'Pan-African Unity Movements',
    ],
    keywords: 'africa,safari,african',
  },
  americas: {
    titles: [
      'Americas Regional Cooperation',
      'North America Economic Updates',
      'South America Development Progress',
      'Americas Trade Agreements',
      'Cultural Diversity in Americas',
      'Technology Hubs in Americas',
      'Americas Environmental Protection',
      'Healthcare Systems Comparison',
      'Education Excellence in Americas',
      'Americas Infrastructure Projects',
    ],
    keywords: 'america,usa,brazil',
  },
  asia: {
    titles: [
      'Asian Economic Powerhouses',
      'Technology Innovation in Asia',
      'Asian Cultural Exchange Programs',
      'Healthcare Advances Across Asia',
      'Asian Education Systems',
      'Infrastructure Mega Projects in Asia',
      'Asian Environmental Initiatives',
      'Trade Relations in Asia',
      'Asian Tourism Industry Growth',
      'Regional Cooperation in Asia',
    ],
    keywords: 'asia,asian,temple',
  },
  australia: {
    titles: [
      'Australian Economy Performance',
      'Wildlife Conservation in Australia',
      'Australian Technology Sector',
      'Indigenous Culture Preservation',
      'Australian Education Excellence',
      'Healthcare in Australia',
      'Australian Sports Achievements',
      'Tourism in Australia',
      'Australian Environmental Policies',
      'Infrastructure Projects Down Under',
    ],
    keywords: 'australia,sydney,kangaroo',
  },
  china: {
    titles: [
      "China's Economic Growth Continues",
      'Technology Innovation in China',
      'Chinese Cultural Heritage',
      'Infrastructure Development in China',
      "China's Space Program Advances",
      'Healthcare Improvements in China',
      'Education System in China',
      'Chinese Renewable Energy Initiatives',
      "China's Global Trade Relations",
      'Tourism Destinations in China',
    ],
    keywords: 'china,beijing,chinese',
  },
  europe: {
    titles: [
      'European Union Policy Updates',
      'European Economy Performance',
      'Cultural Events Across Europe',
      'European Technology Hubs',
      'Healthcare Systems in Europe',
      'European Environmental Initiatives',
      'Education Excellence in Europe',
      'European Infrastructure Projects',
      'Tourism Trends in Europe',
      'European Sports Championships',
    ],
    keywords: 'europe,paris,european',
  },
  india: {
    titles: [
      "India's Economic Growth Story",
      'Technology Boom in India',
      'Indian Cultural Festivals',
      'Infrastructure Development in India',
      'Healthcare Initiatives in India',
      'Indian Education System Reforms',
      'Space Technology Advances in India',
      'Indian Agricultural Innovation',
      'Tourism Opportunities in India',
      "India's Global Diplomatic Relations",
    ],
    keywords: 'india,delhi,indian',
  },
  'middle-east': {
    titles: [
      'Middle East Economic Diversification',
      'Technology Hubs in Middle East',
      'Cultural Heritage Preservation',
      'Infrastructure Mega Projects',
      'Middle East Diplomatic Relations',
      'Tourism Growth in Middle East',
      'Renewable Energy Initiatives',
      'Education Investments in Middle East',
      'Healthcare Advances in Region',
      'Middle East Trade Developments',
    ],
    keywords: 'dubai,desert,middle-east',
  },
  'united-kingdom': {
    titles: [
      'United Kingdom Policy Updates',
      'British Economy Reports',
      'UK Cultural Events Coverage',
      'Technology Industry in UK',
      'UK Healthcare Developments',
      'British Education System',
      'UK Environmental Policies',
      'Infrastructure in United Kingdom',
      'UK Sports News',
      'British Tourism Industry',
    ],
    keywords: 'london,britain,uk',
  },
  // Embassy & Consulates
  'embassy-consulates': {
    titles: [
      'Diplomatic Relations Strengthen',
      'Embassy Services Updates',
      'Consular Services Information',
      'Visa Policy Changes',
      'Embassy Cultural Events',
      'Diplomatic Community News',
      'Consulate Outreach Programs',
      'International Cooperation Initiatives',
      'Embassy Security Protocols',
      'Diplomatic Achievements Celebrated',
    ],
    keywords: 'embassy,diplomatic,flags',
  },
  'iran-embassy': {
    titles: [
      'Iran Embassy Cultural Events',
      'Iran-Pakistan Relations Strengthen',
      'Iranian Cultural Festival',
      'Trade Relations with Iran',
      'Iran Embassy Services Update',
      'Cultural Exchange Programs',
      'Iranian Art Exhibition',
      'Diplomatic Meetings Coverage',
      'Iran Embassy Community Outreach',
      'Bilateral Cooperation Initiatives',
    ],
    keywords: 'iran,persian,tehran',
  },
  'malaysia-embassy': {
    titles: [
      'Malaysia Embassy Cultural Programs',
      'Malaysian Trade Relations',
      'Malaysia Tourism Promotion',
      'Malaysian Cultural Festival',
      'Embassy Services for Malaysians',
      'Malaysia-Pakistan Cooperation',
      'Malaysian Education Opportunities',
      'Diplomatic Relations with Malaysia',
      'Malaysian Business Community Events',
      'Malaysia Embassy Announcements',
    ],
    keywords: 'malaysia,kuala-lumpur,malaysian',
  },
  'usa-embassy': {
    titles: [
      'USA Embassy Visa Services Update',
      'American Cultural Exchange Programs',
      'US-Pakistan Relations News',
      'American Education Opportunities',
      'USA Embassy Security Updates',
      'American Business Community Events',
      'US Aid Programs in Pakistan',
      'American Independence Day Celebrations',
      'USA Embassy Community Outreach',
      'Diplomatic Relations Strengthening',
    ],
    keywords: 'usa,american,washington',
  },
  'uk-embassy': {
    titles: [
      'UK Embassy Services Information',
      'British Cultural Events',
      'UK-Pakistan Trade Relations',
      'British Council Programs',
      'UK Visa Policy Updates',
      'British Education Opportunities',
      'UK Embassy Community Events',
      'Diplomatic Relations News',
      'British Business Community',
      'UK Embassy Announcements',
    ],
    keywords: 'uk,british,london',
  },
  'indonesia-embassy': {
    titles: [
      'Indonesia Embassy Cultural Events',
      'Indonesian Trade Opportunities',
      'Indonesia Tourism Promotion',
      'Indonesian Cultural Festival',
      'Embassy Services for Indonesians',
      'Indonesia-Pakistan Relations',
      'Indonesian Education Programs',
      'Diplomatic Cooperation News',
      'Indonesian Business Community',
      'Indonesia Embassy Updates',
    ],
    keywords: 'indonesia,jakarta,bali',
  },
  'australia-embassy': {
    titles: [
      'Australia Embassy Visa Services',
      'Australian Education Fair',
      'Australia-Pakistan Relations',
      'Australian Cultural Events',
      'Embassy Services Updates',
      'Australian Immigration News',
      'Australia Day Celebrations',
      'Australian Business Opportunities',
      'Diplomatic Relations News',
      'Australia Embassy Community Programs',
    ],
    keywords: 'australia,sydney,australian',
  },
  france: {
    titles: [
      'French Embassy Cultural Programs',
      'France-Pakistan Relations',
      'French Language Courses',
      'French Cultural Festival',
      'France Tourism Promotion',
      'French Education Opportunities',
      'Embassy Services Information',
      'French Business Community Events',
      'Diplomatic Relations Updates',
      'French Art Exhibitions',
    ],
    keywords: 'france,paris,french',
  },
  spain: {
    titles: [
      'Spanish Embassy Cultural Events',
      'Spain-Pakistan Trade Relations',
      'Spanish Language Programs',
      'Spanish Cultural Festival',
      'Spain Tourism Promotion',
      'Spanish Education Opportunities',
      'Embassy Services Updates',
      'Spanish Business Community',
      'Diplomatic Cooperation News',
      'Spanish Art and Culture',
    ],
    keywords: 'spain,madrid,spanish',
  },
  sweden: {
    titles: [
      'Swedish Embassy Programs',
      'Sweden-Pakistan Cooperation',
      'Swedish Innovation Forum',
      'Swedish Cultural Events',
      'Sweden Tourism Information',
      'Swedish Education Excellence',
      'Embassy Services News',
      'Swedish Business Community',
      'Diplomatic Relations Updates',
      'Swedish Sustainability Initiatives',
    ],
    keywords: 'sweden,stockholm,swedish',
  },
  italy: {
    titles: [
      'Italian Embassy Cultural Programs',
      'Italy-Pakistan Relations',
      'Italian Language Courses',
      'Italian Cultural Festival',
      'Italy Tourism Promotion',
      'Italian Education Opportunities',
      'Embassy Services Information',
      'Italian Business Community',
      'Diplomatic Updates',
      'Italian Art Exhibitions',
    ],
    keywords: 'italy,rome,italian',
  },
  ksa: {
    titles: [
      'Saudi Embassy Services Update',
      'KSA-Pakistan Relations',
      'Hajj and Umrah Information',
      'Saudi Cultural Events',
      'KSA Economic Cooperation',
      'Saudi Vision 2030 Updates',
      'Embassy Community Programs',
      'Saudi Business Opportunities',
      'Diplomatic Relations News',
      'KSA Investment in Pakistan',
    ],
    keywords: 'saudi,mecca,arabia',
  },
  // Business
  business: {
    titles: [
      'Business News Roundup',
      'Stock Market Analysis',
      'Entrepreneurship Success Stories',
      'Corporate Earnings Reports',
      'Business Strategy Insights',
      'Start-up Ecosystem Growth',
      'Investment Opportunities',
      'Business Leadership Profiles',
      'Market Trends Analysis',
      'Business Innovation Awards',
    ],
    keywords: 'business,corporate,office',
  },
  // Sports
  sports: {
    titles: [
      'Sports News Headlines',
      'Championship Results Update',
      'Athlete Profiles and Interviews',
      'Sports Industry Business',
      'Upcoming Sports Events',
      'Sports Technology Innovations',
      'Youth Sports Development',
      'Sports Medicine Advances',
      'International Sports Competitions',
      'Sports Community Programs',
    ],
    keywords: 'sports,stadium,athletes',
  },
  football: {
    titles: [
      'Football League Updates',
      'Top Goal Scorers This Season',
      'Football Transfer News',
      'Match Analysis and Highlights',
      'Football Club Profiles',
      'International Football Updates',
      'Football Youth Development',
      'Football Stadium News',
      'Football Legends Interviews',
      'Football Training Tips',
    ],
    keywords: 'football,soccer,stadium',
  },
  tennis: {
    titles: [
      'Tennis Grand Slam Updates',
      'Top Tennis Players Rankings',
      'Tennis Tournament Coverage',
      'Tennis Training Techniques',
      'Tennis Equipment Reviews',
      'Tennis Legends Interviews',
      'Junior Tennis Development',
      'Tennis Court Facilities',
      'Tennis Health Benefits',
      'Tennis Championship Previews',
    ],
    keywords: 'tennis,court,racket',
  },
  golf: {
    titles: [
      'Golf Tournament Results',
      'Golf Course Reviews',
      'Professional Golfers Profiles',
      'Golf Equipment Guide',
      'Golf Training Tips',
      'Golf Championship Coverage',
      'Golf Industry Business',
      'Golf Travel Destinations',
      'Golf Fitness and Health',
      'Golf Community Events',
    ],
    keywords: 'golf,course,golfing',
  },
  olympics: {
    titles: [
      'Olympics Preparation Updates',
      'Olympic Athletes Profiles',
      'Olympics History and Legacy',
      'Olympic Sports Coverage',
      'Olympic Training Centers',
      'Olympics Medal Predictions',
      'Paralympic Games News',
      'Olympic Village Preparations',
      'Olympics Economic Impact',
      'Olympic Spirit and Values',
    ],
    keywords: 'olympics,sports,medal',
  },
  hockey: {
    titles: [
      'Hockey League Updates',
      'Hockey Championship Coverage',
      'Hockey Players Spotlight',
      'Hockey Training Programs',
      'Field Hockey vs Ice Hockey',
      'Hockey Equipment Guide',
      'International Hockey News',
      'Hockey Youth Development',
      'Hockey Club Profiles',
      'Hockey Coaching Tips',
    ],
    keywords: 'hockey,field,sports',
  },
  // Women
  women: {
    titles: [
      'Women Empowerment Stories',
      'Women in Leadership Roles',
      "Women's Health and Wellness",
      'Women Entrepreneurs Success',
      'Women in Technology',
      "Women's Rights Advocacy",
      'Women in Arts and Culture',
      "Women's Education Initiatives",
      'Women Athletes Achievements',
      'Women Community Programs',
    ],
    keywords: 'women,empowerment,female',
  },
  // Science & Tech
  'science-tech': {
    titles: [
      'Latest Technology Innovations',
      'Scientific Discoveries 2026',
      'AI and Machine Learning Updates',
      'Space Exploration News',
      'Biotechnology Advances',
      'Tech Industry Trends',
      'Scientific Research Breakthroughs',
      'Technology for Social Good',
      'STEM Education Initiatives',
      'Future Technology Predictions',
    ],
    keywords: 'technology,science,innovation',
  },
  // Travel
  travel: {
    titles: [
      'Top Travel Destinations 2026',
      'Travel Tips for Budget Travelers',
      'Adventure Travel Experiences',
      'Cultural Travel Journeys',
      'Travel Photography Guide',
      'Sustainable Tourism Practices',
      'Travel Safety Tips',
      'Luxury Travel Experiences',
      'Solo Travel Adventures',
      'Family Travel Destinations',
    ],
    keywords: 'travel,vacation,tourism',
  },
  destinations: {
    titles: [
      'Must-Visit Destinations This Year',
      'Hidden Gem Travel Spots',
      'Beach Destinations Guide',
      'Mountain Retreat Locations',
      'City Break Destinations',
      'Island Paradise Destinations',
      'Historical Travel Destinations',
      'Nature Travel Spots',
      'Romantic Getaway Destinations',
      'Adventure Destinations Guide',
    ],
    keywords: 'destination,beach,mountain',
  },
  'food-news': {
    titles: [
      'Food Trends Around the World',
      'Restaurant Reviews and Guides',
      'Culinary Travel Experiences',
      'Street Food Adventures',
      'Fine Dining Destinations',
      'Food Festival Coverage',
      'Local Cuisine Exploration',
      'Food Photography Tips',
      'Healthy Eating While Traveling',
      'Food Culture Stories',
    ],
    keywords: 'food,restaurant,cuisine',
  },
  videos: {
    titles: [
      'Travel Video Documentaries',
      'Destination Video Guides',
      'Adventure Travel Videos',
      'Cultural Experience Videos',
      'Video Travel Tips',
      'Behind the Scenes Travel',
      'Travel Vlog Highlights',
      'Drone Travel Footage',
      'Video Production Travel',
      'Visual Travel Stories',
    ],
    keywords: 'video,camera,filming',
  },
  stay: {
    titles: [
      'Best Hotels Around the World',
      'Unique Accommodation Reviews',
      'Budget Stay Options',
      'Luxury Resort Experiences',
      'Airbnb vs Hotel Comparison',
      'Eco-Friendly Accommodations',
      'Boutique Hotel Reviews',
      'Hostel Travel Guide',
      'Holiday Rental Tips',
      'Accommodation Booking Guide',
    ],
    keywords: 'hotel,resort,accommodation',
  },
  // Health
  health: {
    titles: [
      'Health and Wellness Tips',
      'Medical Breakthroughs 2026',
      'Mental Health Awareness',
      'Fitness and Exercise Guide',
      'Nutrition and Diet Tips',
      'Healthcare Policy Updates',
      'Preventive Health Measures',
      'Health Technology Innovations',
      'Alternative Medicine Guide',
      'Public Health Initiatives',
    ],
    keywords: 'health,medical,wellness',
  },
};

// Default template for categories not explicitly defined
const defaultTemplate = {
  titles: [
    'Latest Updates and News',
    'Important Developments',
    'Key Highlights This Week',
    'Comprehensive Coverage',
    'In-Depth Analysis',
    'Expert Insights',
    'Community Updates',
    'Special Report',
    'Weekly Roundup',
    'Featured Stories',
  ],
  keywords: 'news,article,report',
};

function generateSlug(title: string, index: number): string {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}-${index}-${Date.now()}`;
}

function generateContent(title: string, categoryName: string): string {
  return `${title}

This is a comprehensive article about ${categoryName}. Our team has compiled the most relevant and up-to-date information to keep you informed.

Key Highlights

In this article, we explore the latest developments, trends, and insights related to ${categoryName}. Stay informed with our expert analysis and in-depth coverage.

Our dedicated team of reporters and analysts work tirelessly to bring you accurate and timely information. Whether you're a professional in the field or simply interested in staying updated, this article provides valuable insights.

What You Need to Know

• Latest developments and updates
• Expert analysis and commentary
• Impact on stakeholders
• Future outlook and predictions

We continue to monitor this story and will provide updates as new information becomes available. Stay connected with us for the latest news and analysis.

Conclusion

Thank you for reading our coverage on ${categoryName}. We value your engagement and encourage you to share your thoughts in the comments section below.`;
}

function getUnsplashImageUrl(keywords: string, index: number): string {
  // Use Unsplash direct image URLs with proper photo IDs for reliable loading
  // These are curated high-quality images that match various categories
  const imageCollections: Record<string, string[]> = {
    pakistan: [
      'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1586076017702-6c5e8f7e9c8c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1604994340280-5e6e7c0b8d59?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=630&fit=crop',
    ],
    politics: [
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=1200&h=630&fit=crop',
    ],
    business: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=630&fit=crop',
    ],
    sports: [
      'https://images.unsplash.com/photo-1461896836934- voices?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=630&fit=crop',
    ],
    football: [
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1529629468130-c9e6593db933?w=1200&h=630&fit=crop',
    ],
    tennis: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1530915534664-4ac6423816b7?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1594470913612-9d5c358b2090?w=1200&h=630&fit=crop',
    ],
    golf: [
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1591491653056-4e9d563a84a8?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1592919505780-303950717480?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1611374243147-44a702c2d44c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1498745373389-65d629b8fd9e?w=1200&h=630&fit=crop',
    ],
    technology: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&h=630&fit=crop',
    ],
    travel: [
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=630&fit=crop',
    ],
    health: [
      'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1200&h=630&fit=crop',
    ],
    world: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1478860409698-8707f313ee8b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop',
    ],
    entertainment: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1485872299829-c673f5194813?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&h=630&fit=crop',
    ],
    women: [
      'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1594744803329-e58b31de8e5b?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1571844307880-751c6d86f3f3?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1589156191108-c762ff4b96ab?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1590649654641-d44b4ac13df1?w=1200&h=630&fit=crop',
    ],
    food: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1482049016gy-2d1ec7ab7445?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&h=630&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=630&fit=crop',
    ],
  };

  // Get image array for the keyword or use a default
  const keywordKey = keywords.split(',')[0].trim().toLowerCase();
  const images = imageCollections[keywordKey] || imageCollections['world'];

  return images[index % images.length];
}
async function seedPosts() {
  console.log('🌱 Starting Posts Seeding...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(Category);
    const postRepo = dataSource.getRepository(Post);

    // Fetch the admin user
    const adminUser = await userRepo.findOne({
      where: { username: 'admin' },
    });

    if (!adminUser) {
      throw new Error(
        '❌ Admin user not found. Please run the basic seed first (npm run seed).',
      );
    }

    console.log(
      `✓ Admin user found: ${adminUser.email} (ID: ${adminUser.id})\n`,
    );

    // Fetch all categories
    const categories = await categoryRepo.find();
    console.log(`✓ Found ${categories.length} categories\n`);

    if (categories.length === 0) {
      throw new Error(
        '❌ No categories found. Please run category seed first (npm run seed:categories).',
      );
    }

    // Delete ALL existing posts for clean seeding
    console.log('🗑️  Removing all existing posts...');
    await postRepo.createQueryBuilder().delete().from(Post).execute();
    console.log('✓ All old posts removed\n');

    let totalPosts = 0;

    for (const category of categories) {
      console.log(`📁 Creating posts for category: ${category.name}`);

      const template = postTemplates[category.slug] || defaultTemplate;
      const titles = template.titles;
      const keywords = template.keywords;

      for (let i = 0; i < 10; i++) {
        const title = titles[i] || `${category.name} Article ${i + 1}`;
        const slug = generateSlug(title, i);
        const content = generateContent(title, category.name);
        const excerpt = `Latest news and updates about ${category.name}. Read our comprehensive coverage and expert analysis.`;
        const featuredImage = getUnsplashImageUrl(keywords, i);

        await postRepo.save({
          title,
          slug,
          content,
          excerpt,
          description: excerpt,
          user_id: adminUser.id,
          category_id: category.id,
          status: PostStatus.PUBLISHED,
          featured_image: featuredImage,
          views_count: Math.floor(Math.random() * 1000),
          likes_count: Math.floor(Math.random() * 100),
          comments_count: 0,
          published_at: new Date(),
        });

        totalPosts++;
      }

      console.log(`   ✓ Created 10 posts for ${category.name}`);
    }

    console.log(`\n✅ Posts seeding completed!`);
    console.log(`   Admin user ID: ${adminUser.id}`);
    console.log(`   Categories processed: ${categories.length}`);
    console.log(`   Total posts created: ${totalPosts}`);
  } catch (error) {
    console.error('❌ Posts seed error:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedPosts();
}

export default seedPosts;
