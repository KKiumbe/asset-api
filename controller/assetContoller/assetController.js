const { PrismaClient, FuelType, TransmissionType, CarCondition } = require('@prisma/client');
const prisma = new PrismaClient();

const createAsset = async (req, res) => {
  const {
    name, price, vin, registrationNumber, yearOfManufacture, make, model, color,
    mileage, fuelType, transmission, engineCapacity, condition, imageUrls
  } = req.body;

  try {
    // Validate required fields
    if (!name || !price || !vin || !make || !model || !yearOfManufacture) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert string inputs to Prisma enums
    const validFuelType = FuelType[fuelType?.toUpperCase()];
    const validTransmission = TransmissionType[transmission?.toUpperCase()];
    const validCondition = CarCondition[condition?.toUpperCase()];

    if (!validFuelType || !validTransmission || !validCondition) {
      return res.status(400).json({ error: 'Invalid fuel type, transmission, or condition' });
    }

    const asset = await prisma.asset.create({
      data: {
        tenantId: req.user.tenantId, // ✅ Ensure tenantId is from the request user
        name,
        price,
        vin,
        registrationNumber,
        yearOfManufacture,
        make,
        model,
        color,
        mileage,
        fuelType: validFuelType,
        transmission: validTransmission,
        engineCapacity,
        condition: validCondition,
        imageUrls: imageUrls || [],
      },
    });

    res.status(201).json(asset);
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(400).json({ error: 'VIN or registration number already exists' });
    }
    console.error("Prisma error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




const getAssets = async (req, res) => {
  const { availableOnly, make, model } = req.query;

  try {
    const where = { tenantId: req.tenantId };
    if (make) where.make = make;
    if (model) where.model = model;
    if (availableOnly === 'true') {
      where.installments = { none: { status: 'ACTIVE' } }; // Only assets without active installments
    }

    const assets = await prisma.asset.findMany({
      where,
      include: { installments: { select: { status: true } } },
    });

    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getTenantAssets = async (req, res) => {
  try {
    const { 
      availableOnly, 
      make, 
      model, 
      page = 1, 
      limit = 10 
    } = req.query;
    const tenantId = req.user.tenantId; // Tenant ID from authenticated user

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized - No tenant information' });
    }

    const where = { tenantId };
    
    // Apply filters
    if (make) where.make = { contains: make, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (availableOnly === 'true') {
      where.installments = {
        none: {
          status: { in: ['PENDING', 'OVERDUE'] }
        }
      };
    }

    const skip = (page - 1) * limit;
    
    // Get assets and total count in parallel
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { 
          installments: { 
            select: { 
              status: true,
              amount: true,
              dueDate: true,
              customer: { 
                select: { 
                  firstName: true,
                  lastName: true 
                } 
              }
            }
          },
          tenant: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit)
      }),
      prisma.asset.count({ where })
    ]);

    res.status(200).json({
      data: assets,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      },
      tenantId
    });
  } catch (error) {
    console.error(`Error fetching assets for tenant ${req.user.tenantId}:`, error);
    res.status(500).json({ error: 'Failed to fetch tenant assets' });
  }
};


const getAssetById = async (req, res) => {
  try {
    const { assetId } = req.params;
    const tenantId = req.user.tenantId; // Tenant ID from authenticated user

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized - No tenant information' });
    }

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
        tenantId: tenantId // Ensure asset belongs to user's tenant
      },
      include: {
        installments: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true
              }
            }
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or not authorized' });
    }

    res.status(200).json(asset);
  } catch (error) {
    console.error(`Error fetching asset ${req.params.assetId}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
};



  
 

module.exports = { createAsset, getAssets,getTenantAssets,getAssetById };