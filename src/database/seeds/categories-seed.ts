import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { dataSourceOptions } from '../../config/database.config';

const dataSource = new DataSource(dataSourceOptions);

interface ChildCategory {
  name: string;
  slug: string;
}

interface ParentCategory {
  name: string;
  slug: string;
  children: ChildCategory[];
}

const categoryTree: ParentCategory[] = [
  {
    name: 'Pakistan',
    slug: 'pakistan',
    children: [
      { name: 'CPEC', slug: 'cpec' },
      { name: 'Politics', slug: 'politics' },
      { name: 'Entertainment', slug: 'entertainment' },
      { name: 'Climate Solutions', slug: 'climate-solutions' },
      { name: 'Weather', slug: 'weather' },
      { name: 'Articles', slug: 'articles' },
    ],
  },
  {
    name: 'World',
    slug: 'world',
    children: [
      { name: 'UK News', slug: 'uk-news' },
      { name: 'South Korea', slug: 'south-korea' },
      { name: 'Africa', slug: 'africa' },
      { name: 'Americas', slug: 'americas' },
      { name: 'Asia', slug: 'asia' },
      { name: 'Australia', slug: 'australia' },
      { name: 'China', slug: 'china' },
      { name: 'Europe', slug: 'europe' },
      { name: 'India', slug: 'india' },
      { name: 'Middle East', slug: 'middle-east' },
      { name: 'United Kingdom', slug: 'united-kingdom' },
    ],
  },
  {
    name: 'Embassy & Consulates',
    slug: 'embassy-consulates',
    children: [
      { name: 'Iran Embassy', slug: 'iran-embassy' },
      { name: 'Malaysia Embassy', slug: 'malaysia-embassy' },
      { name: 'USA Embassy', slug: 'usa-embassy' },
      { name: 'UK Embassy', slug: 'uk-embassy' },
      { name: 'Indonesia Embassy', slug: 'indonesia-embassy' },
      { name: 'Australia Embassy', slug: 'australia-embassy' },
      { name: 'France', slug: 'france' },
      { name: 'Spain', slug: 'spain' },
      { name: 'Sweden', slug: 'sweden' },
      { name: 'Italy', slug: 'italy' },
      { name: 'KSA', slug: 'ksa' },
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    children: [],
  },
  {
    name: 'Sports',
    slug: 'sports',
    children: [
      { name: 'Football', slug: 'football' },
      { name: 'Tennis', slug: 'tennis' },
      { name: 'Golf', slug: 'golf' },
      { name: 'Olympics', slug: 'olympics' },
      { name: 'Hockey', slug: 'hockey' },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    children: [],
  },
  {
    name: 'Science & Tech',
    slug: 'science-tech',
    children: [],
  },
  {
    name: 'Travel',
    slug: 'travel',
    children: [
      { name: 'Destinations', slug: 'destinations' },
      { name: 'Food & News', slug: 'food-news' },
      { name: 'Videos', slug: 'videos' },
      { name: 'Stay', slug: 'stay' },
    ],
  },
  {
    name: 'Health',
    slug: 'health',
    children: [],
  },
];

async function seedCategories() {
  console.log('🌱 Starting Categories Seeding...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(Category);

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

    // Delete all existing categories (children first, then parents)
    console.log('🗑️  Removing existing categories...');
    await categoryRepo
      .createQueryBuilder()
      .delete()
      .from(Category)
      .where('parent_id IS NOT NULL')
      .execute();
    await categoryRepo
      .createQueryBuilder()
      .delete()
      .from(Category)
      .where('parent_id IS NULL')
      .execute();
    console.log('✓ Old categories removed\n');

    let parentCount = 0;
    let childCount = 0;

    for (const parentData of categoryTree) {
      // Create parent category
      const parent = await categoryRepo.save({
        name: parentData.name,
        slug: parentData.slug,
        parent_id: undefined,
        is_active: true,
      });
      parentCount++;
      console.log(`✓ Created parent category: ${parent.name}`);

      // Create child categories
      for (const childData of parentData.children) {
        await categoryRepo.save({
          name: childData.name,
          slug: childData.slug,
          parent_id: parent.id,
          is_active: true,
        });
        childCount++;
        console.log(`    ✓ Created child: ${childData.name}`);
      }
    }

    console.log(`\n✅ Categories seeding completed!`);
    console.log(`   Admin user ID used: ${adminUser.id}`);
    console.log(`   Parent categories created: ${parentCount}`);
    console.log(`   Child categories created:  ${childCount}`);
  } catch (error) {
    console.error('❌ Categories seed error:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedCategories();
}

export default seedCategories;
