import ListingQualityEditor from '../../components/ListingQualityEditor';
import categoryAspects from '../../data/ebay-category-aspects.json';

export default function ListingQualityPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <ListingQualityEditor categoryAspects={categoryAspects} />
    </div>
  );
}
