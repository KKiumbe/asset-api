const { PrismaClient,CustomerStatus } = require('@prisma/client'); // Import the enum
const prisma = new PrismaClient();
// Create a new customer




const createCustomer = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      nationalID, 
      email, 
      phoneNumber, 
      secondaryPhoneNumber, 
      county, 
      town 
    } = req.body;
    const tenantId = req.user?.tenantId; // Optional chaining for safety
    const userId = req.user?.id;

    console.log('Request body:', req.body);
    console.log('User from token:', req.user);

    if (!tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No tenant information available' 
      });
    }

    if (!firstName || !lastName || !phoneNumber || !nationalID) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: 'First name, last name, phone number, and national ID are required' 
      });
    }

    const existingCustomerByPhone = await prisma.customer.findUnique({
      where: { phoneNumber }
    });
    if (existingCustomerByPhone) {
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'Phone number already exists' 
      });
    }

    const existingCustomerByNationalID = await prisma.customer.findFirst({
      where: { nationalID } // This should now work with the updated schema
    });
    if (existingCustomerByNationalID) {
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'National ID already exists' 
      });
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        nationalID,
        email: email || null,
        phoneNumber,
        secondaryPhoneNumber: secondaryPhoneNumber || null,
        county: county || null,
        town: town || null,
        monthlyCharge: null,
        status: 'ACTIVE'
      },
    });

   

    if (!userId) {
      console.warn('User ID is missing, skipping audit log entry');
    } else {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CREATE_CUSTOMER',
          resource: 'CUSTOMER',
          details: { customerId: customer.id },
          description: `Created customer ${firstName} ${lastName} with National ID ${nationalID}`,
        },
      });
    }
    
    

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Detailed error creating customer:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to create customer',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

module.exports = { createCustomer };





