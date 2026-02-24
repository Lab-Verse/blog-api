import seed from './seed';
import visitorPermissionsSeed from './visitor-permissions-seed';
import seedCategories from './categories-seed';
import seedPosts from './posts-seed';

async function runAllSeeds() {
  console.log('🚀 Running all seed files...\n');

  try {
    await seed();
    await visitorPermissionsSeed();
    await seedCategories();
    await seedPosts();

    console.log('\n✅ All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running seeds:', error);
    process.exit(1);
  }
}

runAllSeeds();
