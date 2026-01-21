// API route for assigning UPCs from the pool
import upcPool from '../../data/upc_pool.json';

// In-memory tracking (in production, use a database)
let assignedUPCs = new Set();
let nextUPCIndex = 0;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return assignUPC(req, res);
  } else if (req.method === 'GET') {
    return getUPCStatus(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Assign next available UPC
async function assignUPC(req, res) {
  try {
    // Get unassigned UPCs
    const availableUPCs = upcPool.filter(u => 
      !u.sku && !assignedUPCs.has(u.upc)
    );

    if (availableUPCs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No UPCs available. Please upload more UPC codes.',
        remaining: 0
      });
    }

    // Get next UPC
    const assignedUPC = availableUPCs[nextUPCIndex % availableUPCs.length];
    assignedUPCs.add(assignedUPC.upc);
    nextUPCIndex++;

    // Calculate remaining
    const remaining = availableUPCs.length - assignedUPCs.size;
    const needsRefill = remaining < 100;

    res.status(200).json({
      success: true,
      upc: assignedUPC.upc,
      remaining: remaining,
      total: upcPool.length,
      needsRefill: needsRefill,
      warning: needsRefill ? 'Low UPC count - please upload more codes soon' : null
    });

  } catch (error) {
    console.error('UPC assignment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get UPC pool status
async function getUPCStatus(req, res) {
  try {
    const availableUPCs = upcPool.filter(u => 
      !u.sku && !assignedUPCs.has(u.upc)
    );

    const remaining = availableUPCs.length - assignedUPCs.size;

    res.status(200).json({
      total: upcPool.length,
      available: remaining,
      assigned: upcPool.length - remaining,
      needsRefill: remaining < 100
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
