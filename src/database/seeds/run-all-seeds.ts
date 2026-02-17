import seed from './seed';
import comprehensiveSeed from './comprehensive-seed';
import visitorPermissionsSeed from './visitor-permissions-seed';
import postsPerCategorySeed from './posts-per-category-seed';

async function runAllSeeds() {
  console.log('🚀 Running all seed files...\n');
  
  try {
    await seed();
    await comprehensiveSeed();
    await visitorPermissionsSeed();
    await postsPerCategorySeed();
    
    console.log('\n✅ All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running seeds:', error);
    process.exit(1);
  }
}

runAllSeeds();
