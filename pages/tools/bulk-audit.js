import BulkAuditTool from '../../components/BulkAuditTool';
import categoryAspects from '../../data/ebay-category-aspects.json';

export default function BulkAuditPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <BulkAuditTool categoryAspects={categoryAspects} />
    </div>
  );
}
