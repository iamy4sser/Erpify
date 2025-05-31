import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import treasuryRoutes from './routes/treasury.js';
import invoiceRoutes from './routes/invoices.js';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/filters', invoiceRoutes);

// Create MySQL connection pools
const dolibarrDb = mysql.createPool({
  host: process.env.DB_DOLIBARR_HOST,
  user: process.env.DB_DOLIBARR_USER,
  password: process.env.DB_DOLIBARR_PASSWORD,
  database: process.env.DB_DOLIBARR_NAME,
  port: parseInt(process.env.DB_DOLIBARR_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const erpDb = mysql.createPool({
  host: process.env.DB_ERP_HOST,
  user: process.env.DB_ERP_USER,
  password: process.env.DB_ERP_PASSWORD,
  database: process.env.DB_ERP_NAME,
  port: parseInt(process.env.DB_ERP_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connections
async function testConnections() {
  try {
    // Test Dolibarr connection
    const dolibarrConnection = await dolibarrDb.getConnection();
    console.log('Successfully connected to Dolibarr database');
    dolibarrConnection.release();

    // Test ERP connection
    const erpConnection = await erpDb.getConnection();
    console.log('Successfully connected to ERP database');
    erpConnection.release();
  } catch (err) {
    console.error('Error connecting to databases:', err);
    console.log('Continuing server startup despite database connection issues...');
  }
}

// Helper function to merge and deduplicate results
function mergeResults(dolibarrResults, erpResults, idField = 'id') {
  const merged = [...dolibarrResults];
  
  for (const erpItem of erpResults) {
    const existingIndex = merged.findIndex(item => item[idField] === erpItem[idField]);
    if (existingIndex === -1) {
      merged.push(erpItem);
    }
  }
  
  return merged;
}

// Contacts API
app.get('/api/contacts', async (req, res) => {
  try {
    // Get query parameters
    const { status } = req.query;

    // Validate status parameter
    const validStatuses = ['customer', 'supplier', 'prospect'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Fetch contacts from Dolibarr and ERP concurrently
    const [dolibarrRows, erpRows] = await Promise.all([
      dolibarrDb.query(`
        SELECT 
          t.rowid as id,
          t.nom as name,
          t.name_alias as company,
          t.email,
          t.phone,
          t.address,
          t.status,
          t.client as customer,
          t.fournisseur as supplier,
          t.datec as created_at,
          t.tms as updated_at,
          t.note_private as notes
        FROM llx_societe t
        WHERE t.entity = 1
        ORDER BY t.nom
      `),
      erpDb.query(`
        SELECT 
          id,
          name,
          company,
          email,
          phone,
          address,
          status,
          customer,
          supplier,
          created_at,
          updated_at,
          notes
        FROM contacts
        ORDER BY name
      `)
    ]);

    // Transform Dolibarr results
    const dolibarrContacts = dolibarrRows[0].map(row => ({
      id: `dolibarr-${row.id}`,
      name: row.name,
      company: row.company || row.name,
      email: row.email,
      phone: row.phone,
      status: row.customer ? 'customer' : (row.supplier ? 'supplier' : 'prospect'),
      favorite: false,
      lastContact: row.updated_at,
      address: row.address,
      notes: row.notes
    }));

    // Transform ERP results
    const erpContacts = erpRows[0].map(row => ({
      id: `erp-${row.id}`,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      status: row.status || 'prospect', // Default to 'prospect' if status is not set
      favorite: false,
      lastContact: row.updated_at,
      address: row.address,
      notes: row.notes
    }));

    // Merge results
    const contacts = mergeResults(dolibarrContacts, erpContacts);

    // Apply status filter if provided
    const filteredContacts = status
      ? contacts.filter(contact => contact.status === status)
      : contacts;

    res.json(filteredContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts', message: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      name,
      company,
      email,
      phone,
      status,
      address,
      notes
    } = req.body;

    // Check for existing email
    const [existingContacts] = await connection.query(
      'SELECT id FROM contacts WHERE email = ?',
      [email]
    );

    if (existingContacts.length > 0) {
      throw new Error('Un contact avec cet email existe déjà');
    }

    // Insert contact into ERP database
    const [result] = await connection.query(
      `INSERT INTO contacts (
        name,
        company,
        email,
        phone,
        status,
        address,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name,
        company,
        email,
        phone,
        status,
        address || null,
        notes || null
      ]
    );

    await connection.commit();

    // Get created contact
    const [newContact] = await connection.query(
      'SELECT * FROM contacts WHERE id = ?',
      [result.insertId]
    );

    res.json({
      id: newContact[0].id.toString(),
      name: newContact[0].name,
      company: newContact[0].company,
      email: newContact[0].email,
      phone: newContact[0].phone,
      status: newContact[0].status,
      favorite: false,
      lastContact: newContact[0].updated_at,
      address: newContact[0].address,
      notes: newContact[0].notes
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating contact:', error);
    res.status(500).json({ 
      error: 'Failed to create contact',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, status, address, notes } = req.body;

    // Validation de l'ID
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      return res.status(400).json({ message: "Invalid contact ID format" });
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    // Validation des champs requis
    if (!name || !email || !status) {
      return res.status(400).json({ message: "Missing required fields: name, email, or status" });
    }

    if (idPrefix === 'dolibarr') {
      // Validation du statut
      if (!['prospect', 'customer', 'supplier'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      let dolibarrStatus = 0; // Prospect
      if (status === 'customer') dolibarrStatus = 1;
      else if (status === 'supplier') dolibarrStatus = 2;

      // Vérification de l'existence du contact
      const [existingRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_societe WHERE rowid = ?`,
        [numericId]
      );
      console.log('Existing Dolibarr contact:', existingRows);

      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ message: "Dolibarr contact not found" });
      }

      // Mise à jour
      const [updateResult] = await dolibarrDb.query(
        `UPDATE llx_societe SET
          nom = ?,
          name_alias = ?,
          email = ?,
          phone = ?,
          status = ?,
          address = ?,
          note_private = ?,
          tms = NOW()
        WHERE rowid = ?`,
        [name, company, email, phone, dolibarrStatus, address || null, notes || null, numericId]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: "No Dolibarr contact updated" });
      }

      // Récupération du contact mis à jour
      const [updatedRows] = await dolibarrDb.query(
        `SELECT rowid as id, nom as name, name_alias as company, email, phone, status, address, note_private as notes, tms as updated_at
         FROM llx_societe WHERE rowid = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedContact = updatedRows[0];
        const dolibarrContact = {
          id: `dolibarr-${updatedContact.id}`,
          name: updatedContact.name,
          company: updatedContact.company || updatedContact.name,
          email: updatedContact.email,
          phone: updatedContact.phone,
          status,
          favorite: false,
          lastContact: updatedContact.updated_at,
          address: updatedContact.address,
          notes: updatedContact.notes,
        };
        return res.json({ dolibarr: dolibarrContact });
      } else {
        return res.status(404).json({ message: "Dolibarr contact not found after update" });
      }
    } else if (idPrefix === 'erp') {
      // Mise à jour ERP
      const [updateResult] = await erpDb.query(
        `UPDATE contacts SET
          name = ?,
          company = ?,
          email = ?,
          phone = ?,
          status = ?,
          address = ?,
          notes = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [name, company, email, phone, status, address || null, notes || null, numericId]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: "No ERP contact updated" });
      }

      // Récupération du contact mis à jour
      const [updatedRows] = await erpDb.query(
        `SELECT * FROM contacts WHERE id = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedContact = updatedRows[0];
        const erpContact = {
          id: `erp-${updatedContact.id}`,
          name: updatedContact.name,
          company: updatedContact.company,
          email: updatedContact.email,
          phone: updatedContact.phone,
          status: updatedContact.status,
          favorite: false,
          lastContact: updatedContact.updated_at,
          address: updatedContact.address,
          notes: updatedContact.notes,
        };
        return res.json({ erp: erpContact });
      } else {
        return res.status(404).json({ message: "ERP contact not found after update" });
      }
    }
  } catch (error) {
    console.error('Error updating contact:', error.sqlMessage || error.message, error.sql || '');
    return res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE route to delete a contact
app.delete('/api/contacts/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Extract the numeric ID from the string
    const numericId = parseInt(id.split('-')[1], 10);

    // Delete contact from ERP database
    await connection.query(
      'DELETE FROM contacts WHERE id = ?',
      [numericId]
    );

    await connection.commit();

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Products API
app.get('/api/products', async (req, res) => {
  try {
    // Get products from Dolibarr
    const [dolibarrRows] = await dolibarrDb.query(`
      SELECT 
        rowid as id,
        ref as reference,
        label as name,
        description,
        price,
        tva_tx as tax,
        stock,
        fk_product_type as category,
        tosell as status
      FROM llx_product
      WHERE entity = 1
      ORDER BY ref
    `);

    // Get products from ERP
    const [erpRows] = await erpDb.query(`
      SELECT 
        id,
        reference,
        name,
        description,
        price,
        tax,
        stock,
        category,
        status
      FROM products
      ORDER BY reference
    `);

    // Transform Dolibarr results
    const dolibarrProducts = dolibarrRows.map(row => ({
      id: `dolibarr-${row.id}`,
      reference: row.reference,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      tax: parseFloat(row.tax),
      stock: parseInt(row.stock),
      category: row.category === 0 ? 'product' : 'service',
      status: row.status === 1 ? 'active' : 'inactive'
    }));

    // Transform ERP results
    const erpProducts = erpRows.map(row => ({
      id: `erp-${row.id}`,
      reference: row.reference,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      tax: parseFloat(row.tax),
      stock: parseInt(row.stock),
      category: row.category,
      status: row.status
    }));

    // Merge results
    const products = mergeResults(dolibarrProducts, erpProducts, 'reference');

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      name,
      reference,
      description,
      price,
      tax,
      stock,
      category,
      status
    } = req.body;

    // Check for existing reference
    const [existingProducts] = await connection.query(
      'SELECT id FROM products WHERE reference = ?',
      [reference]
    );

    if (existingProducts.length > 0) {
      throw new Error('Un produit avec cette référence existe déjà');
    }

    // Insert product into ERP database
    const [result] = await connection.query(
      `INSERT INTO products (
        reference,
        name,
        description,
        price,
        tax,
        stock,
        category,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        reference,
        name,
        description,
        price,
        tax,
        stock,
        category,
        status
      ]
    );

    await connection.commit();

    res.json({
      id: result.insertId.toString(),
      reference,
      name,
      description,
      price,
      tax,
      stock,
      category,
      status
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT route to update a product
app.put('/api/products/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { name, reference, description, price, tax, stock, category, status } = req.body;

    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    if (!name || !reference || !price || !tax || !stock || !category || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (idPrefix === 'dolibarr') {
      const dolibarrCategory = category === 'product' ? 0 : 1;
      const dolibarrStatus = status === 'active' ? 1 : 0;

      const [existingRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_product WHERE rowid = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ error: 'Dolibarr product not found' });
      }

      const [updateResult] = await dolibarrDb.query(
        `UPDATE llx_product SET
          ref = ?,
          label = ?,
          description = ?,
          price = ?,
          tva_tx = ?,
          stock = ?,
          fk_product_type = ?,
          tosell = ?,
          tms = NOW()
        WHERE rowid = ?`,
        [reference, name, description, price, tax, stock, dolibarrCategory, dolibarrStatus, numericId]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'No Dolibarr product updated' });
      }

      const [updatedRows] = await dolibarrDb.query(
        `SELECT rowid as id, ref as reference, label as name, description, price, tva_tx as tax, stock, fk_product_type as category, tosell as status
         FROM llx_product WHERE rowid = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedProduct = updatedRows[0];
        const dolibarrProduct = {
          id: `dolibarr-${updatedProduct.id}`,
          reference: updatedProduct.reference,
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: parseFloat(updatedProduct.price),
          tax: parseFloat(updatedProduct.tax),
          stock: parseInt(updatedProduct.stock),
          category: updatedProduct.category === 0 ? 'product' : 'service',
          status: updatedProduct.status === 1 ? 'active' : 'inactive'
        };
        await connection.commit();
        return res.json(dolibarrProduct);
      } else {
        return res.status(404).json({ error: 'Dolibarr product not found after update' });
      }
    } else if (idPrefix === 'erp') {
      const [existingProducts] = await connection.query(
        'SELECT id FROM products WHERE reference = ? AND id != ?',
        [reference, numericId]
      );

      if (existingProducts.length > 0) {
        throw new Error('Un produit avec cette référence existe déjà');
      }

      const [updateResult] = await connection.query(
        `UPDATE products SET
          name = ?,
          reference = ?,
          description = ?,
          price = ?,
          tax = ?,
          stock = ?,
          category = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          name,
          reference,
          description,
          price,
          tax,
          stock,
          category,
          status,
          numericId
        ]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'No ERP product updated' });
      }

      const [updatedProduct] = await connection.query(
        'SELECT * FROM products WHERE id = ?',
        [numericId]
      );

      if (updatedProduct.length === 0) {
        return res.status(404).json({ error: 'ERP product not found after update' });
      }

      await connection.commit();
      res.json({
        id: `erp-${updatedProduct[0].id}`,
        name: updatedProduct[0].name,
        reference: updatedProduct[0].reference,
        description: updatedProduct[0].description,
        price: parseFloat(updatedProduct[0].price),
        tax: parseFloat(updatedProduct[0].tax),
        stock: parseInt(updatedProduct[0].stock),
        category: updatedProduct[0].category,
        status: updatedProduct[0].status,
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating product:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// DELETE route to delete a product
app.delete('/api/products/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Validate ID format
    if (!/^erp-\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    // Extract the numeric ID from the string
    const numericId = parseInt(id.split('-')[1], 10);

    // Supprimer les enregistrements dépendants dans order_items
    await connection.execute(
      'DELETE FROM order_items WHERE product_id = ?',
      [numericId]
    );

    // Delete product from ERP database
    await connection.query(
      'DELETE FROM products WHERE id = ?',
      [numericId]
    );

    await connection.commit();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    // Get quotes from Dolibarr
    const [dolibarrRows] = await dolibarrDb.query(`
      SELECT 
        p.rowid as id,
        p.ref as number,
        p.datec as date,
        p.fin_validite as validUntil,
        p.fk_statut as status,
        s.rowid as clientId,
        s.nom as clientName,
        s.email as clientEmail,
        p.total_ht as subtotal,
        p.total_tva as tax,
        p.total_ttc as total,
        p.note_private as notes
      FROM llx_propal p
      JOIN llx_societe s ON p.fk_soc = s.rowid
      WHERE p.entity = 1
      ORDER BY p.datec DESC
    `);

    // Get quotes from ERP, including quotes with no matching contact
    const [erpRows] = await erpDb.query(`
      SELECT 
        q.id,
        q.number,
        q.date,
        q.valid_until as validUntil,
        q.status,
        q.client_id as clientId,
        c.name as clientName,
        c.email as clientEmail,
        q.subtotal,
        q.tax,
        q.total,
        q.notes
      FROM quotes q
      LEFT JOIN contacts c ON q.client_id = c.id
      ORDER BY q.date DESC
    `);

    // Transform Dolibarr results
    const dolibarrQuotes = dolibarrRows.map(row => ({
      id: `dolibarr-${row.id}`,
      number: row.number,
      date: row.date,
      validUntil: row.validUntil,
      status: row.status === 0 ? 'pending' : 
              row.status === 1 ? 'sent' :
              row.status === 2 ? 'accepted' :
              'rejected',
      clientId: `dolibarr-${row.clientId}`,
      clientName: row.clientName,
      clientEmail: row.clientEmail || '',
      subtotal: parseFloat(row.subtotal) || 0,
      tax: parseFloat(row.tax) || 0,
      total: parseFloat(row.total) || 0,
      notes: row.notes || ''
    }));

    // Transform ERP results, handling Dolibarr clients
    const erpQuotes = [];
    for (const row of erpRows) {
      let clientName = row.clientName;
      let clientEmail = row.clientEmail || '';
      let clientId = `erp-${row.clientId}`;

      // If no contact was found (likely a Dolibarr client), fetch from llx_societe
      if (!row.clientName) {
        const [dolibarrClient] = await dolibarrDb.query(
          `SELECT 
            nom as name,
            email
          FROM llx_societe 
          WHERE rowid = ?`,
          [row.clientId]
        );

        if (dolibarrClient && dolibarrClient.length > 0) {
          clientName = dolibarrClient[0].name;
          clientEmail = dolibarrClient[0].email || '';
          clientId = `dolibarr-${row.clientId}`;
        } else {
          // Fallback if client not found in either database
          clientName = `Unknown Client (${row.clientId})`;
          clientEmail = '';
        }
      }

      erpQuotes.push({
        id: `erp-${row.id}`,
        number: row.number,
        date: row.date,
        validUntil: row.validUntil,
        status: row.status,
        clientId,
        clientName,
        clientEmail,
        subtotal: parseFloat(row.subtotal) || 0,
        tax: parseFloat(row.tax) || 0,
        total: parseFloat(row.total) || 0,
        notes: row.notes || ''
      });
    }

    // Merge results
    const quotes = mergeResults(dolibarrQuotes, erpQuotes, 'id');

    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes', message: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      clientId,
      validUntil,
      items,
      notes
    } = req.body;

    // Log request body for debugging
    console.log('Received request body:', req.body);

    // Validate required fields
    if (!clientId || !validUntil || !items || !Array.isArray(items)) {
      throw new Error('Missing or invalid required fields');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const idParts = clientId.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);
    let client_id; // To be used in quotes table
    let clientDetails; // For response

    if (idPrefix === 'dolibarr') {
      // Verify Dolibarr client exists
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email,
          phone,
          address,
          status,
          client as customer,
          fournisseur as supplier
        FROM llx_societe 
        WHERE rowid = ?`,
        [numericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = numericId; // Use rowid directly
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email,
        status: dolibarrClient[0].customer ? 'customer' : (dolibarrClient[0].supplier ? 'supplier' : 'prospect')
      };
    } else {
      // Verify ERP client exists
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email,
          status
        FROM contacts 
        WHERE id = ?`,
        [numericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = numericId; // Use contacts.id
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email,
        status: erpClient[0].status
      };
    }

    // Generate unique quote number
    const currentYear = new Date().getFullYear();
    const [lastQuote] = await connection.query(
      'SELECT MAX(CAST(SUBSTRING(number, 7) AS UNSIGNED)) as last_num FROM quotes WHERE number LIKE ?',
      [`DE${currentYear}%`]
    );

    let lastNum = lastQuote[0]?.last_num || 0;
    let nextNum = lastNum ? parseInt(lastNum, 10) + 1 : 1;
    const quoteNumber = `DE${currentYear}${String(nextNum).padStart(3, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    // Insert quote
    const [result] = await connection.query(
      `INSERT INTO quotes (
        number,
        date,
        valid_until,
        status,
        client_id,
        subtotal,
        tax,
        total,
        notes,
        created_at,
        updated_at
      ) VALUES (?, NOW(), ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        quoteNumber,
        validUntil,
        client_id,
        subtotal,
        tax,
        total,
        notes
      ]
    );

    // Insert quote items
    for (const item of items) {
      await connection.query(
        `INSERT INTO quote_items (
          quote_id,
          description,
          quantity,
          unit_price,
          tax,
          total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          item.description,
          item.quantity,
          item.unitPrice,
          item.tax,
          item.total
        ]
      );
    }

    await connection.commit();

    res.json({
      id: `erp-${result.insertId}`,
      number: quoteNumber,
      date: new Date().toISOString(),
      validUntil,
      status: 'pending',
      clientId: clientId,
      clientName: clientDetails.name,
      clientEmail: clientDetails.email,
      items,
      subtotal,
      tax,
      total,
      notes
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating quote:', error);
    res.status(500).json({ 
      error: 'Failed to create quote',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { clientId, validUntil, status, items, notes } = req.body;

    // Validate request body
    if (!clientId || !validUntil || !status || !items || !Array.isArray(items)) {
      throw new Error('Missing or invalid required fields');
    }

    if (!['pending', 'sent', 'accepted', 'rejected'].includes(status)) {
      throw new Error('Invalid status value');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const clientIdParts = clientId.split('-');
    if (clientIdParts.length !== 2 || !['dolibarr', 'erp'].includes(clientIdParts[0]) || isNaN(parseInt(clientIdParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const clientIdPrefix = clientIdParts[0];
    const clientNumericId = parseInt(clientIdParts[1], 10);
    let client_id;
    let clientDetails;

    // Verify client exists
    if (clientIdPrefix === 'dolibarr') {
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email
        FROM llx_societe 
        WHERE rowid = ?`,
        [clientNumericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email || ''
      };
    } else {
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email
        FROM contacts 
        WHERE id = ?`,
        [clientNumericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email || ''
      };
    }

    // Validate quote ID
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error('Invalid quote ID format');
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    if (idPrefix === 'dolibarr') {
      const dolibarrStatus = status === 'pending' ? 0 :
                            status === 'sent' ? 1 :
                            status === 'accepted' ? 2 : 3;

      const [existingRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_propal WHERE rowid = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('Dolibarr quote not found');
      }

      await dolibarrDb.query(
        `UPDATE llx_propal SET
          fk_soc = ?,
          fin_validite = ?,
          fk_statut = ?,
          total_ht = ?,
          total_tva = ?,
          total_ttc = ?,
          note_private = ?,
          tms = NOW()
        WHERE rowid = ?`,
        [client_id, validUntil, dolibarrStatus, subtotal, tax, total, notes || null, numericId]
      );

      await dolibarrDb.query(
        `DELETE FROM llx_propal_det WHERE fk_propal = ?`,
        [numericId]
      );

      for (const item of items) {
        await dolibarrDb.query(
          `INSERT INTO llx_propal_det (
            fk_propal,
            description,
            qty,
            subprice,
            tva_tx,
            total_ht
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      const [updatedRows] = await dolibarrDb.query(
        `SELECT 
          p.rowid as id,
          p.ref as number,
          p.datec as date,
          p.fin_validite as validUntil,
          p.fk_statut as status,
          s.rowid as clientId,
          s.nom as clientName,
          s.email as clientEmail,
          p.total_ht as subtotal,
          p.total_tva as tax,
          p.total_ttc as total,
          p.note_private as notes
        FROM llx_propal p
        JOIN llx_societe s ON p.fk_soc = s.rowid
        WHERE p.rowid = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedQuote = updatedRows[0];
        const dolibarrQuote = {
          id: `dolibarr-${updatedQuote.id}`,
          number: updatedQuote.number,
          date: updatedQuote.date,
          validUntil: updatedQuote.validUntil,
          status: updatedQuote.status === 0 ? 'pending' :
                  updatedQuote.status === 1 ? 'sent' :
                  updatedQuote.status === 2 ? 'accepted' : 'rejected',
          clientId: `dolibarr-${updatedQuote.clientId}`,
          clientName: updatedQuote.clientName,
          clientEmail: updatedQuote.clientEmail || '',
          subtotal: parseFloat(updatedQuote.subtotal) || 0,
          tax: parseFloat(updatedQuote.tax) || 0,
          total: parseFloat(updatedQuote.total) || 0,
          notes: updatedQuote.notes || '',
          items
        };
        await connection.commit();
        return res.json(dolibarrQuote);
      } else {
        throw new Error('Dolibarr quote not found after update');
      }
    } else {
      // ERP quote
      const [existingRows] = await connection.query(
        `SELECT id FROM quotes WHERE id = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('ERP quote not found');
      }

      await connection.query(
        `UPDATE quotes SET
          client_id = ?,
          valid_until = ?,
          status = ?,
          subtotal = ?,
          tax = ?,
          total = ?,
          notes = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [client_id, validUntil, status, subtotal, tax, total, notes || null, numericId]
      );

      await connection.query(
        `DELETE FROM quote_items WHERE quote_id = ?`,
        [numericId]
      );

      for (const item of items) {
        await connection.query(
          `INSERT INTO quote_items (
            quote_id,
            description,
            quantity,
            unit_price,
            tax,
            total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      // Fetch updated quote with LEFT JOIN to handle Dolibarr clients
      const [updatedQuote] = await connection.query(
        `SELECT 
          q.id,
          q.number,
          q.date,
          q.valid_until as validUntil,
          q.status,
          q.client_id as clientId,
          q.subtotal,
          q.tax,
          q.total,
          q.notes
        FROM quotes q
        WHERE q.id = ?`,
        [numericId]
      );

      if (updatedQuote.length === 0) {
        throw new Error('ERP quote not found after update');
      }

      // Fetch client details based on client_id
      let clientName = clientDetails.name;
      let clientEmail = clientDetails.email;
      let responseClientId = clientDetails.id;

      await connection.commit();

      res.json({
        id: `erp-${updatedQuote[0].id}`,
        number: updatedQuote[0].number,
        date: updatedQuote[0].date,
        validUntil: updatedQuote[0].validUntil,
        status: updatedQuote[0].status,
        clientId: responseClientId,
        clientName,
        clientEmail,
        subtotal: parseFloat(updatedQuote[0].subtotal) || 0,
        tax: parseFloat(updatedQuote[0].tax) || 0,
        total: parseFloat(updatedQuote[0].total) || 0,
        notes: updatedQuote[0].notes || '',
        items
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating quote:', error);
    res.status(500).json({ 
      error: 'Failed to update quote',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    if (!id.startsWith('erp-')) {
      throw new Error('Invalid ID format: must start with "erp-"');
    }

    const quoteId = parseInt(id.split('-')[1], 10);

    if (isNaN(quoteId)) {
      throw new Error('Invalid ID format: numeric part is not a valid number');
    }

    await connection.execute(
      'DELETE FROM quote_items WHERE quote_id = ?',
      [quoteId]
    );

    const [result] = await connection.execute(
      'DELETE FROM quotes WHERE id = ?',
      [quoteId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Quote not found');
    }

    await connection.commit();

    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting quote:', error);
    const statusCode = error.message === 'Quote not found' ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to delete quote',
      message: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    // Get orders from Dolibarr
    const [dolibarrRows] = await dolibarrDb.query(`
      SELECT 
        c.rowid as id,
        c.ref as number,
        c.date_creation as date,
        c.fk_statut as status,
        s.rowid as clientId,
        s.nom as clientName,
        s.email as clientEmail,
        s.address as shippingAddress,
        c.total_ht as subtotal,
        c.total_tva as tax,
        c.total_ttc as total,
        c.note_private as notes
      FROM llx_commande c
      JOIN llx_societe s ON c.fk_soc = s.rowid
      WHERE c.entity = 1
      ORDER BY c.date_creation DESC
    `);

    // Get orders from ERP, including orders with no matching contact
    const [erpRows] = await erpDb.query(`
      SELECT 
        o.id,
        o.number,
        o.date,
        o.status,
        o.client_id as clientId,
        c.name as clientName,
        c.email as clientEmail,
        o.shipping_address as shippingAddress,
        o.subtotal,
        o.tax,
        o.total,
        o.notes
      FROM orders o
      LEFT JOIN contacts c ON o.client_id = c.id
      ORDER BY o.date DESC
    `);

    // Transform Dolibarr results
    const dolibarrOrders = dolibarrRows.map(row => ({
      id: `dolibarr-${row.id}`,
      number: row.number,
      date: row.date,
      status: row.status === 0 ? 'pending' :
              row.status === 1 ? 'confirmed' :
              row.status === 2 ? 'shipped' :
              row.status === 3 ? 'delivered' : 'cancelled',
      clientId: `dolibarr-${row.clientId}`,
      clientName: row.clientName,
      clientEmail: row.clientEmail || '',
      shippingAddress: row.shippingAddress || '',
      subtotal: parseFloat(row.subtotal) || 0,
      tax: parseFloat(row.tax) || 0,
      total: parseFloat(row.total) || 0,
      notes: row.notes || ''
    }));

    // Transform ERP results, handling Dolibarr clients
    const erpOrders = [];
    for (const row of erpRows) {
      let clientName = row.clientName;
      let clientEmail = row.clientEmail || '';
      let clientId = `erp-${row.clientId}`;

      // If no contact was found (likely a Dolibarr client), fetch from llx_societe
      if (!row.clientName) {
        const [dolibarrClient] = await dolibarrDb.query(
          `SELECT 
            nom as name,
            email
          FROM llx_societe 
          WHERE rowid = ?`,
          [row.clientId]
        );

        if (dolibarrClient && dolibarrClient.length > 0) {
          clientName = dolibarrClient[0].name;
          clientEmail = dolibarrClient[0].email || '';
          clientId = `dolibarr-${row.clientId}`;
        } else {
          // Fallback if client not found in either database
          clientName = `Unknown Client (${row.clientId})`;
          clientEmail = '';
        }
      }

      erpOrders.push({
        id: `erp-${row.id}`,
        number: row.number,
        date: row.date,
        status: row.status,
        clientId,
        clientName,
        clientEmail,
        shippingAddress: row.shippingAddress || '',
        subtotal: parseFloat(row.subtotal) || 0,
        tax: parseFloat(row.tax) || 0,
        total: parseFloat(row.total) || 0,
        notes: row.notes || ''
      });
    }

    // Merge results
    const orders = mergeResults(dolibarrOrders, erpOrders, 'id');

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      clientId,
      items,
      shippingAddress,
      notes
    } = req.body;

    // Log request body for debugging
    console.log('Received request body:', req.body);

    // Validate required fields
    if (!clientId || !items || !Array.isArray(items) || !shippingAddress) {
      throw new Error('Missing or invalid required fields');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const idParts = clientId.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);
    let client_id; // To be used in orders table
    let clientDetails; // For response

    if (idPrefix === 'dolibarr') {
      // Verify Dolibarr client exists
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email,
          address
        FROM llx_societe 
        WHERE rowid = ?`,
        [numericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = numericId; // Use rowid directly
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email || '',
        address: dolibarrClient[0].address || ''
      };
    } else {
      // Verify ERP client exists
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email,
          address
        FROM contacts 
        WHERE id = ?`,
        [numericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = numericId; // Use contacts.id
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email || '',
        address: erpClient[0].address || ''
      };
    }

    // Generate unique order number
    const currentYear = new Date().getFullYear();
    const [lastOrder] = await connection.query(
      'SELECT MAX(CAST(SUBSTRING(number, 8, 3) AS UNSIGNED)) as last_num FROM orders WHERE number LIKE ?',
      [`CMD${currentYear}%`]
    );

    let lastNum = lastOrder[0]?.last_num || 0;
    let nextNum = lastNum ? parseInt(lastNum, 10) + 1 : 1;
    const orderNumber = `CMD${currentYear}${String(nextNum).padStart(3, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    // Insert order
    const [result] = await connection.query(
      `INSERT INTO orders (
        number,
        date,
        status,
        client_id,
        shipping_address,
        subtotal,
        tax,
        total,
        notes,
        created_at,
        updated_at
      ) VALUES (?, NOW(), 'pending', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderNumber,
        client_id,
        shippingAddress,
        subtotal,
        tax,
        total,
        notes || null
      ]
    );

    // Insert order items
    for (const item of items) {
      const productId = item.productId ? item.productId.split('-')[1] : null;
      if (productId) {
        const [product] = await connection.query(
          'SELECT id FROM products WHERE id = ?',
          [productId]
        );
        if (!product.length) {
          throw new Error(`Product not found: ${item.productId}`);
        }
      }
      await connection.query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          description,
          quantity,
          unit_price,
          tax,
          total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          productId,
          item.description,
          item.quantity,
          item.unitPrice,
          item.tax,
          item.total
        ]
      );
    }

    await connection.commit();

    res.json({
      id: `erp-${result.insertId}`,
      number: orderNumber,
      date: new Date().toISOString(),
      status: 'pending',
      clientId: clientId,
      clientName: clientDetails.name,
      clientEmail: clientDetails.email,
      shippingAddress,
      subtotal,
      tax,
      total,
      notes: notes || '',
      items
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/orders/:id
app.put('/api/orders/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { clientId, status, items, shippingAddress, notes } = req.body;

    // Validate request body
    if (!clientId || !status || !items || !Array.isArray(items) || !shippingAddress) {
      throw new Error('Missing or invalid required fields');
    }

    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      throw new Error('Invalid status value');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const clientIdParts = clientId.split('-');
    if (clientIdParts.length !== 2 || !['dolibarr', 'erp'].includes(clientIdParts[0]) || isNaN(parseInt(clientIdParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const clientIdPrefix = clientIdParts[0];
    const clientNumericId = parseInt(clientIdParts[1], 10);
    let client_id;
    let clientDetails;

    // Verify client exists
    if (clientIdPrefix === 'dolibarr') {
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email,
          address
        FROM llx_societe 
        WHERE rowid = ?`,
        [clientNumericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email || '',
        address: dolibarrClient[0].address || ''
      };
    } else {
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email,
          address
        FROM contacts 
        WHERE id = ?`,
        [clientNumericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email || '',
        address: erpClient[0].address || ''
      };
    }

    // Validate order ID
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error('Invalid order ID format');
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    if (idPrefix === 'dolibarr') {
      const dolibarrStatus = status === 'pending' ? 0 :
                            status === 'confirmed' ? 1 :
                            status === 'shipped' ? 2 :
                            status === 'delivered' ? 3 : -1;

      const [existingRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_commande WHERE rowid = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('Dolibarr order not found');
      }

      await dolibarrDb.query(
        `UPDATE llx_commande SET
          fk_soc = ?,
          fk_statut = ?,
          total_ht = ?,
          total_tva = ?,
          total_ttc = ?,
          note_private = ?,
          tms = NOW()
        WHERE rowid = ?`,
        [client_id, dolibarrStatus, subtotal, tax, total, notes || null, numericId]
      );

      await dolibarrDb.query(
        `DELETE FROM llx_commandedet WHERE fk_commande = ?`,
        [numericId]
      );

      for (const item of items) {
        const productId = item.productId ? item.productId.split('-')[1] : null;
        await dolibarrDb.query(
          `INSERT INTO llx_commandedet (
            fk_commande,
            fk_product,
            description,
            qty,
            subprice,
            tva_tx,
            total_ht
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            productId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      const [updatedRows] = await dolibarrDb.query(
        `SELECT 
          c.rowid as id,
          c.ref as number,
          c.date_creation as date,
          c.fk_statut as status,
          s.rowid as clientId,
          s.nom as clientName,
          s.email as clientEmail,
          s.address as shippingAddress,
          c.total_ht as subtotal,
          c.total_tva as tax,
          c.total_ttc as total,
          c.note_private as notes
        FROM llx_commande c
        JOIN llx_societe s ON c.fk_soc = s.rowid
        WHERE c.rowid = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedOrder = updatedRows[0];
        const dolibarrOrder = {
          id: `dolibarr-${updatedOrder.id}`,
          number: updatedOrder.number,
          date: updatedOrder.date,
          status: updatedOrder.status === 0 ? 'pending' :
                  updatedOrder.status === 1 ? 'confirmed' :
                  updatedOrder.status === 2 ? 'shipped' :
                  updatedOrder.status === 3 ? 'delivered' : 'cancelled',
          clientId: `dolibarr-${updatedOrder.clientId}`,
          clientName: updatedOrder.clientName,
          clientEmail: updatedOrder.clientEmail || '',
          shippingAddress: updatedOrder.shippingAddress || '',
          subtotal: parseFloat(updatedOrder.subtotal) || 0,
          tax: parseFloat(updatedOrder.tax) || 0,
          total: parseFloat(updatedOrder.total) || 0,
          notes: updatedOrder.notes || '',
          items
        };
        await connection.commit();
        return res.json(dolibarrOrder);
      } else {
        throw new Error('Dolibarr order not found after update');
      }
    } else {
      // ERP order
      const [existingRows] = await connection.query(
        `SELECT id FROM orders WHERE id = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('ERP order not found');
      }

      await connection.query(
        `UPDATE orders SET
          client_id = ?,
          status = ?,
          shipping_address = ?,
          subtotal = ?,
          tax = ?,
          total = ?,
          notes = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [client_id, status, shippingAddress, subtotal, tax, total, notes || null, numericId]
      );

      await connection.query(
        `DELETE FROM order_items WHERE order_id = ?`,
        [numericId]
      );

      for (const item of items) {
        const productId = item.productId ? item.productId.split('-')[1] : null;
        if (productId) {
          const [product] = await connection.query(
            'SELECT id FROM products WHERE id = ?',
            [productId]
          );
          if (!product.length) {
            throw new Error(`Product not found: ${item.productId}`);
          }
        }
        await connection.query(
          `INSERT INTO order_items (
            order_id,
            product_id,
            description,
            quantity,
            unit_price,
            tax,
            total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            productId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      // Fetch updated order without JOIN to handle Dolibarr clients
      const [updatedOrder] = await connection.query(
        `SELECT 
          o.id,
          o.number,
          o.date,
          o.status,
          o.client_id as clientId,
          o.shipping_address as shippingAddress,
          o.subtotal,
          o.tax,
          o.total,
          o.notes
        FROM orders o
        WHERE o.id = ?`,
        [numericId]
      );

      if (updatedOrder.length === 0) {
        throw new Error('ERP order not found after update');
      }

      await connection.commit();

      res.json({
        id: `erp-${updatedOrder[0].id}`,
        number: updatedOrder[0].number,
        date: updatedOrder[0].date,
        status: updatedOrder[0].status,
        clientId: clientDetails.id,
        clientName: clientDetails.name,
        clientEmail: clientDetails.email,
        shippingAddress: updatedOrder[0].shippingAddress || '',
        subtotal: parseFloat(updatedOrder[0].subtotal) || 0,
        tax: parseFloat(updatedOrder[0].tax) || 0,
        total: parseFloat(updatedOrder[0].total) || 0,
        notes: updatedOrder[0].notes || '',
        items
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ 
      error: 'Failed to update order',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Validate ID format
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error('Invalid ID format: must be "erp-<id>" or "dolibarr-<id>"');
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    if (idPrefix === 'erp') {
      // Delete ERP order
      await connection.execute(
        'DELETE FROM order_items WHERE order_id = ?',
        [numericId]
      );

      const [result] = await connection.execute(
        'DELETE FROM orders WHERE id = ?',
        [numericId]
      );

      if (result.affectedRows === 0) {
        throw new Error('ERP order not found');
      }
    } else {
      // Delete Dolibarr order
      await dolibarrDb.execute(
        'DELETE FROM llx_commandedet WHERE fk_commande = ?',
        [numericId]
      );

      const [result] = await dolibarrDb.execute(
        'DELETE FROM llx_commande WHERE rowid = ?',
        [numericId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Dolibarr order not found');
      }
    }

    await connection.commit();

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to delete order',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/invoices
app.get('/api/invoices', async (req, res) => {
  try {
    // Get invoices from Dolibarr
    const [dolibarrRows] = await dolibarrDb.query(`
      SELECT 
        f.rowid as id,
        f.ref as number,
        f.datec as date,
        f.date_lim_reglement as dueDate,
        f.fk_statut as status,
        s.rowid as clientId,
        s.nom as clientName,
        s.email as clientEmail,
        f.total_ht as subtotal,
        f.total_tva as tax,
        f.total_ttc as total,
        f.note_private as notes
      FROM llx_facture f
      JOIN llx_societe s ON f.fk_soc = s.rowid
      WHERE f.entity = 1
      ORDER BY f.datec DESC
    `);

    // Get invoices from ERP, including invoices with no matching contact
    const [erpRows] = await erpDb.query(`
      SELECT 
        i.id,
        i.number,
        i.date,
        i.due_date as dueDate,
        i.status,
        i.client_id as clientId,
        c.name as clientName,
        c.email as clientEmail,
        i.subtotal,
        i.tax,
        i.total,
        i.notes,
        i.foreignAmount,
        i.exchangeRate,
        i.madAmount,
        i.paymentDate,
        i.bank,
        i.paymentStatus,
        i.paymentMethod
      FROM invoices i
      LEFT JOIN contacts c ON i.client_id = c.id
      ORDER BY i.date DESC
    `);

    // Transform Dolibarr results
    const dolibarrInvoices = dolibarrRows.map(row => ({
      id: `dolibarr-${row.id}`,
      number: row.number,
      date: row.date,
      dueDate: row.dueDate,
      status: row.status === 0 ? 'pending' :
              row.status === 1 ? 'sent' :
              row.status === 2 ? 'paid' :
              row.status === 3 ? 'cancelled' : 'overdue',
      clientId: `dolibarr-${row.clientId}`,
      clientName: row.clientName,
      clientEmail: row.clientEmail || '',
      subtotal: parseFloat(row.subtotal) || 0,
      tax: parseFloat(row.tax) || 0,
      total: parseFloat(row.total) || 0,
      notes: row.notes || '',
      // Les nouveaux champs ne sont pas disponibles dans Dolibarr
      foreignAmount: null,
      exchangeRate: null,
      madAmount: null,
      paymentDate: null,
      bank: null,
      paymentStatus: null,
      paymentMethod: null,
    }));

    // Transform ERP results, handling Dolibarr clients
    const erpInvoices = [];
    for (const row of erpRows) {
      let clientName = row.clientName;
      let clientEmail = row.clientEmail || '';
      let clientId = `erp-${row.clientId}`;

      // If no contact was found (likely a Dolibarr client), fetch from llx_societe
      if (!row.clientName) {
        const [dolibarrClient] = await dolibarrDb.query(
          `SELECT 
            nom as name,
            email
          FROM llx_societe 
          WHERE rowid = ?`,
          [row.clientId]
        );

        if (dolibarrClient && dolibarrClient.length > 0) {
          clientName = dolibarrClient[0].name;
          clientEmail = dolibarrClient[0].email || '';
          clientId = `dolibarr-${row.clientId}`;
        } else {
          // Fallback if client not found in either database
          clientName = `Unknown Client (${row.clientId})`;
          clientEmail = '';
        }
      }

      erpInvoices.push({
        id: `erp-${row.id}`,
        number: row.number,
        date: row.date,
        dueDate: row.dueDate,
        status: row.status,
        clientId,
        clientName,
        clientEmail,
        subtotal: parseFloat(row.subtotal) || 0,
        tax: parseFloat(row.tax) || 0,
        total: parseFloat(row.total) || 0,
        notes: row.notes || '',
        foreignAmount: row.foreignAmount || null,
        exchangeRate: row.exchangeRate || null,
        madAmount: row.madAmount || null,
        paymentDate: row.paymentDate || null,
        bank: row.bank || null,
        paymentStatus: row.paymentStatus || null,
        paymentMethod: row.paymentMethod || null,
      });
    }

    // Merge results
    const invoices = mergeResults(dolibarrInvoices, erpInvoices, 'id');

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
  }
});

// POST /api/invoices
app.post('/api/invoices', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      clientId,
      dueDate,
      items,
      notes,
      foreignAmount,
      exchangeRate,
      madAmount,
      paymentDate,
      bank,
      paymentStatus,
      paymentMethod
    } = req.body;

    // Log request body for debugging
    console.log('Received request body:', req.body);

    // Validate required fields
    if (!clientId || !dueDate || !items || !Array.isArray(items)) {
      throw new Error('Missing or invalid required fields');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const idParts = clientId.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);
    let client_id; // To be used in invoices table
    let clientDetails; // For response

    if (idPrefix === 'dolibarr') {
      // Verify Dolibarr client exists
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email
        FROM llx_societe 
        WHERE rowid = ?`,
        [numericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = numericId; // Use rowid directly
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email || ''
      };
    } else {
      // Verify ERP client exists
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email
        FROM contacts 
        WHERE id = ?`,
        [numericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = numericId; // Use contacts.id
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email || ''
      };
    }

    // Generate unique invoice number
    const currentYear = new Date().getFullYear();
    const [lastInvoice] = await connection.query(
      'SELECT MAX(CAST(SUBSTRING(number, 7) AS UNSIGNED)) as last_num FROM invoices WHERE number LIKE ?',
      [`FA${currentYear}%`]
    );

    let lastNum = lastInvoice[0]?.last_num || 0;
    let nextNum = lastNum ? parseInt(lastNum, 10) + 1 : 1;
    const invoiceNumber = `FA${currentYear}${String(nextNum).padStart(3, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    // Insert invoice
    const [result] = await connection.query(
      `INSERT INTO invoices (
        number,
        date,
        due_date,
        status,
        client_id,
        subtotal,
        tax,
        total,
        notes,
        created_at,
        updated_at,
        foreignAmount,
        exchangeRate,
        madAmount,
        paymentDate,
        bank,
        paymentStatus,
        paymentMethod
      ) VALUES (?, NOW(), ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        dueDate,
        client_id,
        subtotal,
        tax,
        total,
        notes || null,
        foreignAmount || null,
        exchangeRate || null,
        madAmount || null,
        paymentDate || null,
        bank || null,
        paymentStatus || null,
        paymentMethod || null
      ]
    );

    // Insert invoice items
    for (const item of items) {
      await connection.query(
        `INSERT INTO invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          tax,
          total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          item.description,
          item.quantity,
          item.unitPrice,
          item.tax,
          item.total
        ]
      );
    }

    await connection.commit();

    res.json({
      id: `erp-${result.insertId}`,
      number: invoiceNumber,
      date: new Date().toISOString(),
      dueDate,
      status: 'pending',
      clientId: clientId,
      clientName: clientDetails.name,
      clientEmail: clientDetails.email,
      subtotal,
      tax,
      total,
      notes: notes || '',
      items,
      foreignAmount,
      exchangeRate,
      madAmount,
      paymentDate,
      bank,
      paymentStatus,
      paymentMethod
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/invoices/:id
app.put('/api/invoices/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { clientId, dueDate, status, items, notes, foreignAmount, exchangeRate, madAmount, paymentDate, bank, paymentStatus, paymentMethod } = req.body;

    // Validate request body
    if (!clientId || !dueDate || !status || !items || !Array.isArray(items)) {
      throw new Error('Missing or invalid required fields');
    }

    if (!['pending', 'sent', 'paid', 'cancelled', 'overdue'].includes(status)) {
      throw new Error('Invalid status value');
    }

    // Validate clientId type
    if (typeof clientId !== 'string') {
      console.error('Invalid clientId type:', typeof clientId, clientId);
      throw new Error(`clientId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${clientId} (${typeof clientId})`);
    }

    // Validate clientId format
    const clientIdParts = clientId.split('-');
    if (clientIdParts.length !== 2 || !['dolibarr', 'erp'].includes(clientIdParts[0]) || isNaN(parseInt(clientIdParts[1], 10))) {
      throw new Error(`Invalid clientId format: ${clientId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
    }

    const clientIdPrefix = clientIdParts[0];
    const clientNumericId = parseInt(clientIdParts[1], 10);
    let client_id;
    let clientDetails;

    // Verify client exists
    if (clientIdPrefix === 'dolibarr') {
      const [dolibarrClient] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          name_alias as company,
          email
        FROM llx_societe 
        WHERE rowid = ?`,
        [clientNumericId]
      );

      if (!dolibarrClient || dolibarrClient.length === 0) {
        throw new Error('Dolibarr client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `dolibarr-${dolibarrClient[0].id}`,
        name: dolibarrClient[0].name,
        company: dolibarrClient[0].company || dolibarrClient[0].name,
        email: dolibarrClient[0].email || ''
      };
    } else {
      const [erpClient] = await connection.query(
        `SELECT 
          id,
          name,
          company,
          email
        FROM contacts 
        WHERE id = ?`,
        [clientNumericId]
      );

      if (!erpClient || erpClient.length === 0) {
        throw new Error('ERP client not found');
      }

      client_id = clientNumericId;
      clientDetails = {
        id: `erp-${erpClient[0].id}`,
        name: erpClient[0].name,
        company: erpClient[0].company,
        email: erpClient[0].email || ''
      };
    }

    // Validate invoice ID
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error('Invalid invoice ID format');
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    const total = subtotal + tax;

    if (idPrefix === 'dolibarr') {
      const dolibarrStatus = status === 'pending' ? 0 :
                            status === 'sent' ? 1 :
                            status === 'paid' ? 2 :
                            status === 'cancelled' ? 3 : 1; // Overdue maps to sent with late payment

      const [existingRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_facture WHERE rowid = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('Dolibarr invoice not found');
      }

      await dolibarrDb.query(
        `UPDATE llx_facture SET
          fk_soc = ?,
          date_lim_reglement = ?,
          fk_statut = ?,
          total_ht = ?,
          total_tva = ?,
          total_ttc = ?,
          note_private = ?,
          tms = NOW()
        WHERE rowid = ?`,
        [client_id, dueDate, dolibarrStatus, subtotal, tax, total, notes || null, numericId]
      );

      await dolibarrDb.query(
        `DELETE FROM llx_facturedet WHERE fk_facture = ?`,
        [numericId]
      );

      for (const item of items) {
        await dolibarrDb.query(
          `INSERT INTO llx_facturedet (
            fk_facture,
            description,
            qty,
            subprice,
            tva_tx,
            total_ht
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      const [updatedRows] = await dolibarrDb.query(
        `SELECT 
          f.rowid as id,
          f.ref as number,
          f.datec as date,
          f.date_lim_reglement as dueDate,
          f.fk_statut as status,
          s.rowid as clientId,
          s.nom as clientName,
          s.email as clientEmail,
          f.total_ht as subtotal,
          f.total_tva as tax,
          f.total_ttc as total,
          f.note_private as notes
        FROM llx_facture f
        JOIN llx_societe s ON f.fk_soc = s.rowid
        WHERE f.rowid = ?`,
        [numericId]
      );

      if (updatedRows && updatedRows.length > 0) {
        const updatedInvoice = updatedRows[0];
        const dolibarrInvoice = {
          id: `dolibarr-${updatedInvoice.id}`,
          number: updatedInvoice.number,
          date: updatedInvoice.date,
          dueDate: updatedInvoice.dueDate,
          status: updatedInvoice.status === 0 ? 'pending' :
                  updatedInvoice.status === 1 ? 'sent' :
                  updatedInvoice.status === 2 ? 'paid' :
                  updatedInvoice.status === 3 ? 'cancelled' : 'overdue',
          clientId: `dolibarr-${updatedInvoice.clientId}`,
          clientName: updatedInvoice.clientName,
          clientEmail: updatedInvoice.clientEmail || '',
          subtotal: parseFloat(updatedInvoice.subtotal) || 0,
          tax: parseFloat(updatedInvoice.tax) || 0,
          total: parseFloat(updatedInvoice.total) || 0,
          notes: updatedInvoice.notes || '',
          items
        };
        await connection.commit();
        return res.json(dolibarrInvoice);
      } else {
        throw new Error('Dolibarr invoice not found after update');
      }
    } else {
      // ERP invoice
      const [existingRows] = await connection.query(
        `SELECT id FROM invoices WHERE id = ?`,
        [numericId]
      );

      if (!existingRows || existingRows.length === 0) {
        throw new Error('ERP invoice not found');
      }

      await connection.query(
        `UPDATE invoices SET
          client_id = ?,
          due_date = ?,
          status = ?,
          subtotal = ?,
          tax = ?,
          total = ?,
          notes = ?,
          updated_at = NOW(),
          foreignAmount = ?,
          exchangeRate = ?,
          madAmount = ?,
          paymentDate = ?,
          bank = ?,
          paymentStatus = ?,
          paymentMethod = ?
        WHERE id = ?`,
        [client_id, dueDate, status, subtotal, tax, total, notes || null, foreignAmount || null, exchangeRate || null, madAmount || null, paymentDate || null, bank || null, paymentStatus || null, paymentMethod || null, numericId]
      );

      await connection.query(
        `DELETE FROM invoice_items WHERE invoice_id = ?`,
        [numericId]
      );

      for (const item of items) {
        await connection.query(
          `INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            tax,
            total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            numericId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.tax,
            item.total
          ]
        );
      }

      // Fetch updated invoice without JOIN to handle Dolibarr clients
      const [updatedInvoice] = await connection.query(
        `SELECT 
          i.id,
          i.number,
          i.date,
          i.due_date as dueDate,
          i.status,
          i.client_id as clientId,
          i.subtotal,
          i.tax,
          i.total,
          i.notes,
          i.foreignAmount,
          i.exchangeRate,
          i.madAmount,
          i.paymentDate,
          i.bank,
          i.paymentStatus,
          i.paymentMethod
        FROM invoices i
        WHERE i.id = ?`,
        [numericId]
      );

      if (updatedInvoice.length === 0) {
        throw new Error('ERP invoice not found after update');
      }

      await connection.commit();

      res.json({
        id: `erp-${updatedInvoice[0].id}`,
        number: updatedInvoice[0].number,
        date: updatedInvoice[0].date,
        dueDate: updatedInvoice[0].dueDate,
        status: updatedInvoice[0].status,
        clientId: clientDetails.id,
        clientName: clientDetails.name,
        clientEmail: clientDetails.email,
        subtotal: parseFloat(updatedInvoice[0].subtotal) || 0,
        tax: parseFloat(updatedInvoice[0].tax) || 0,
        total: parseFloat(updatedInvoice[0].total) || 0,
        notes: updatedInvoice[0].notes || '',
        foreignAmount: updatedInvoice[0].foreignAmount || null,
        exchangeRate: updatedInvoice[0].exchangeRate || null,
        madAmount: updatedInvoice[0].madAmount || null,
        paymentDate: updatedInvoice[0].paymentDate || null,
        bank: updatedInvoice[0].bank || null,
        paymentStatus: updatedInvoice[0].paymentStatus || null,
        paymentMethod: updatedInvoice[0].paymentMethod || '',
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating invoice:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ 
      error: 'Failed to update invoice',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// DELETE /api/invoices/:id
app.delete('/api/invoices/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Validate ID format
    const idParts = id.split('-');
    if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
      throw new Error('Invalid ID format: must be "erp-<id>" or "dolibarr-<id>"');
    }

    const idPrefix = idParts[0];
    const numericId = parseInt(idParts[1], 10);

    if (idPrefix === 'erp') {
      // Delete ERP invoice
      await connection.execute(
        'DELETE FROM invoice_items WHERE invoice_id = ?',
        [numericId]
      );

      const [result] = await connection.execute(
        'DELETE FROM invoices WHERE id = ?',
        [numericId]
      );

      if (result.affectedRows === 0) {
        throw new Error('ERP invoice not found');
      }
    } else {
      // Delete Dolibarr invoice
      await dolibarrDb.execute(
        'DELETE FROM llx_facturedet WHERE fk_facture = ?',
        [numericId]
      );

      const [result] = await dolibarrDb.execute(
        'DELETE FROM llx_facture WHERE rowid = ?',
        [numericId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Dolibarr invoice not found');
      }
    }

    await connection.commit();

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting invoice:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to delete invoice',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Helper function to fetch client details (reused from previous updates)
const fetchClientDetails = async (clientId, source) => {
  let client;
  if (source === 'dolibarr') {
    const [dolibarrRows] = await dolibarrDb.query(
      `SELECT 
        rowid as id,
        nom as name,
        nom as company,
        email
      FROM llx_societe
      WHERE rowid = ?`,
      [clientId]
    );

    if (dolibarrRows.length > 0) {
      const row = dolibarrRows[0];
      client = {
        id: `dolibarr-${row.id}`,
        name: row.name || '',
        company: row.company || '',
        email: row.email || ''
      };
    }
  } else {
    const [erpRows] = await erpDb.query(
      `SELECT 
        id,
        name,
        company,
        email
      FROM contacts
      WHERE id = ?`,
      [clientId]
    );

    if (erpRows.length > 0) {
      const row = erpRows[0];
      client = {
        id: `erp-${row.id}`,
        name: row.name || '',
        company: row.company || '',
        email: row.email || ''
      };
    } else {
      // Fallback to Dolibarr
      const [dolibarrRows] = await dolibarrDb.query(
        `SELECT 
          rowid as id,
          nom as name,
          nom as company,
          email
        FROM llx_societe
        WHERE rowid = ?`,
        [clientId]
      );

      if (dolibarrRows.length > 0) {
        const row = dolibarrRows[0];
        client = {
          id: `dolibarr-${row.id}`,
          name: row.name || '',
          company: row.company || '',
          email: row.email || ''
        };
      }
    }
  }
  return client || null;
};

// GET /api/projects
app.get('/api/projects', async (req, res) => {
  try {
    // Get projects from Dolibarr
    const [dolibarrRows] = await dolibarrDb.query(`
      SELECT 
        p.rowid as id,
        p.ref,
        p.title as name,
        p.description,
        p.fk_statut as status,
        p.dateo as startDate,
        p.datee as endDate,
        p.budget_amount as budget,
        s.rowid as clientId,
        s.nom as clientName,
        s.nom as clientCompany,
        s.email as clientEmail
      FROM llx_projet p
      LEFT JOIN llx_societe s ON p.fk_soc = s.rowid
      WHERE p.entity = 1
      ORDER BY p.datec DESC
    `);

    // Get projects from ERP
    const [erpRows] = await erpDb.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.progress,
        p.start_date as startDate,
        p.end_date as endDate,
        p.budget,
        p.spent,
        p.team_size as teamSize,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.client_id
      FROM projects p
      ORDER BY p.created_at DESC
    `);

    // Transform Dolibarr results
    const dolibarrProjects = dolibarrRows.map(row => ({
      id: `dolibarr-${row.id.toString()}`,
      name: row.name || '',
      description: row.description || '',
      status: row.status === 0 ? 'on-hold' :
              row.status === 1 ? 'active' :
              'completed',
      progress: 0, // Dolibarr projects don't have progress; default to 0
      startDate: row.startDate,
      endDate: row.endDate,
      budget: parseFloat(row.budget) || 0,
      spent: 0, // Dolibarr projects don't have spent; default to 0
      teamSize: 0, // Dolibarr projects don't have teamSize; default to 0
      createdAt: row.startDate, // Approximate createdAt with startDate
      updatedAt: row.endDate || row.startDate, // Approximate updatedAt
      client_id: row.clientId ? `dolibarr-${row.clientId}` : null,
      client: row.clientId ? {
        id: `dolibarr-${row.clientId}`,
        name: row.clientName || '',
        company: row.clientCompany || row.clientName || '',
        email: row.clientEmail || ''
      } : { id: null, name: 'Unknown Client', company: '', email: '' }
    }));

    // Transform ERP results
    const erpProjects = await Promise.all(
      erpRows.map(async (row) => {
        let clientId = row.client_id;
        let source = 'erp'; // Default to ERP
        let client = null;

        if (clientId) {
          // Check if the client_id exists in Dolibarr first
          const [dolibarrCheck] = await dolibarrDb.query(
            `SELECT rowid FROM llx_societe WHERE rowid = ?`,
            [clientId]
          );
          if (dolibarrCheck.length > 0) {
            source = 'dolibarr';
          }

          client = await fetchClientDetails(clientId, source);
        }

        return {
          id: row.id.toString(),
          name: row.name || '',
          description: row.description || '',
          status: row.status || 'active',
          progress: row.progress || 0,
          startDate: row.startDate,
          endDate: row.endDate,
          budget: parseFloat(row.budget) || 0,
          spent: parseFloat(row.spent) || 0,
          teamSize: row.teamSize || 0,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          client_id: client ? client.id : null,
          client: client || { id: null, name: 'Unknown Client', company: '', email: '' }
        };
      })
    );

    // Merge results (assuming mergeResults combines the arrays and sorts by createdAt)
    const projects = [...dolibarrProjects, ...erpProjects].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', message: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      name,
      description,
      status,
      startDate,
      endDate,
      budget,
      teamSize,
      client_id
    } = req.body;

    if (!client_id) {
      throw new Error('Client ID is required');
    }

    // Determine if the client is from Dolibarr or ERP
    let clientId;
    let source;
    if (client_id.startsWith('dolibarr-')) {
      clientId = client_id.replace('dolibarr-', '');
      source = 'dolibarr';
    } else if (client_id.startsWith('erp-')) {
      clientId = client_id.replace('erp-', '');
      source = 'erp';
    } else {
      throw new Error('Invalid client ID format');
    }

    // Validate client existence
    if (source === 'dolibarr') {
      const [dolibarrRows] = await dolibarrDb.query(
        `SELECT rowid FROM llx_societe WHERE rowid = ?`,
        [clientId]
      );
      if (dolibarrRows.length === 0) {
        throw new Error(`Client dolibarr-${clientId} not found`);
      }
    } else {
      const [erpRows] = await erpDb.query(
        `SELECT id FROM contacts WHERE id = ?`,
        [clientId]
      );
      if (erpRows.length === 0) {
        // Fallback to Dolibarr
        const [dolibarrRows] = await dolibarrDb.query(
          `SELECT rowid FROM llx_societe WHERE rowid = ?`,
          [clientId]
        );
        if (dolibarrRows.length === 0) {
          throw new Error(`Client erp-${clientId} not found`);
        }
        // Update source to reflect that the client is from Dolibarr
        source = 'dolibarr';
      }
    }

    // Insert project
    const [result] = await connection.query(
      `INSERT INTO projects (
        name,
        description,
        status,
        progress,
        start_date,
        end_date,
        budget,
        spent,
        team_size,
        created_at,
        updated_at,
        client_id
      ) VALUES (?, ?, ?, 0, ?, ?, ?, 0, ?, NOW(), NOW(), ?)`,
      [
        name,
        description,
        status,
        startDate,
        endDate,
        budget,
        teamSize,
        clientId
      ]
    );

    await connection.commit();

    // Return the client_id in the original format
    const returnedClientId = `${source}-${clientId}`;

    res.json({
      id: result.insertId.toString(),
      name,
      description,
      status,
      progress: 0,
      startDate,
      endDate,
      budget,
      spent: 0,
      teamSize,
      client_id: returnedClientId
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating project:', error);
    res.status(500).json({ 
      error: 'Failed to create project',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const projectId = req.params.id;
  const updatedProject = req.body;

  // Extract client data
  const { client, ...projectData } = updatedProject;

  try {
    // Update project data
    await erpDb.query(
      `UPDATE projects SET 
        name = ?, 
        description = ?, 
        status = ?, 
        progress = ?,
        start_date = ?,
        end_date = ?,
        budget = ?, 
        spent = ?, 
        team_size = ? 
      WHERE id = ?`,
      [
        projectData.name,
        projectData.description,
        projectData.status,
        projectData.progress,
        projectData.startDate,
        projectData.endDate,
        projectData.budget,
        projectData.spent,
        projectData.teamSize,
        projectId,
      ]
    );

    const [rows] = await erpDb.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const projectId = req.params.id;

  try {
    await erpDb.query('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Accounts API
app.get('/api/accounts', async (req, res) => {
  try {
    const [rows] = await erpDb.query(`
      SELECT 
        id,
        code,
        name,
        type,
        balance,
        parent_id as parent
      FROM accounts
      ORDER BY code
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

app.post('/api/accounts', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      code,
      name,
      type,
      balance,
      parent
    } = req.body;

    // Check for existing code
    const [existingAccounts] = await connection.query(
      'SELECT id FROM accounts WHERE code = ?',
      [code]
    );

    if (existingAccounts.length > 0) {
      throw new Error('Un compte avec ce code existe déjà');
    }

    // Insert account
    const [result] = await connection.query(
      `INSERT INTO accounts (
        code,
        name,
        type,
        balance,
        parent_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        code,
        name,
        type,
        balance,
        parent || null
      ]
    );

    await connection.commit();

    res.json({
      id: result.insertId.toString(),
      code,
      name,
      type,
      balance,
      parent
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating account:', error);
    res.status(500).json({ 
      error: 'Failed to create account',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Journals API
app.get('/api/journals', async (req, res) => {
  try {
    const [rows] = await erpDb.query(`
      SELECT 
        id,
        code,
        name,
        type
      FROM journals
      ORDER BY code
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching journals:', error);
    res.status(500).json({ error: 'Failed to fetch journals' });
  }
});

// Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      accountId,
      journalId,
      documentNumber,
      minAmount,
      maxAmount
    } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND t.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND t.date <= ?';
      params.push(endDate);
    }

    if (accountId) {
      whereClause += ' AND t.account_id = ?';
      params.push(accountId);
    }

    if (journalId) {
      whereClause += ' AND t.journal_id = ?';
      params.push(journalId);
    }

    if (documentNumber) {
      whereClause += ' AND t.document_number LIKE ?';
      params.push(`%${documentNumber}%`);
    }

    if (minAmount) {
      whereClause += ' AND t.total >= ?';
      params.push(minAmount);
    }

    if (maxAmount) {
      whereClause += ' AND t.total <= ?';
      params.push(maxAmount);
    }

    const [rows] = await erpDb.query(`
      SELECT 
        t.id,
        t.date,
        t.journal_id,
        j.code as journal_code,
        j.name as journal_name,
        t.document_number,
        t.invoice_number,
        t.reference,
        t.account_id,
        a.code as account_code,
        a.name as account_name,
        t.contact_id,
        c.name as contact_name,
        t.description,
        t.due_date,
        t.status,
        t.total,
        e.id as entry_id,
        e.debit,
        e.credit,
        e.description as entry_description
      FROM transactions t
      JOIN journals j ON t.journal_id = j.id
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN contacts c ON t.contact_id = c.id
      JOIN transaction_entries e ON t.id = e.transaction_id
      WHERE ${whereClause}
      ORDER BY t.date DESC, t.id DESC, e.id ASC
    `, params);

    // Group entries by transaction
    const transactions = rows.reduce((acc, row) => {
      const transactionId = row.id;
      
      if (!acc[transactionId]) {
        acc[transactionId] = {
          id: row.id,
          date: row.date,
          journalId: row.journal_id,
          journalCode: row.journal_code,
          journalName: row.journal_name,
          documentNumber: row.document_number,
          invoiceNumber: row.invoice_number,
          reference: row.reference,
          accountId: row.account_id,
          accountCode: row.account_code,
          accountName: row.account_name,
          contactId: row.contact_id,
          contactName: row.contact_name,
          description: row.description,
          dueDate: row.due_date,
          status: row.status,
          total: row.total,
          entries: []
        };
      }

      acc[transactionId].entries.push({
        id: row.entry_id,
        accountCode: row.entry_account_code,
        accountName: row.entry_account_name,
        debit: row.debit,
        credit: row.credit,
        description: row.entry_description
      });

      return acc;
    }, {});

    res.json(Object.values(transactions));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions
app.post('/api/transactions', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      date,
      journalId,
      documentNumber,
      invoiceNumber,
      reference,
      accountId,
      contactId,
      description,
      dueDate,
      entries
    } = req.body;

    // Log request body for debugging
    console.log('Received request body:', req.body);

    // Validate required fields
    if (!date || !journalId || !accountId || !entries || !Array.isArray(entries)) {
      throw new Error('Missing or invalid required fields');
    }

    // Validate contactId if provided
    let client_id = null;
    let clientDetails = { id: '', name: '', email: '' };
    if (contactId) {
      if (typeof contactId !== 'string') {
        console.error('Invalid contactId type:', typeof contactId, contactId);
        throw new Error(`contactId must be a string in format "dolibarr-<id>" or "erp-<id>", received: ${contactId} (${typeof contactId})`);
      }

      const idParts = contactId.split('-');
      if (idParts.length !== 2 || !['dolibarr', 'erp'].includes(idParts[0]) || isNaN(parseInt(idParts[1], 10))) {
        throw new Error(`Invalid contactId format: ${contactId}. Expected format: "dolibarr-<id>" or "erp-<id>"`);
      }

      const idPrefix = idParts[0];
      const numericId = parseInt(idParts[1], 10);

      if (idPrefix === 'dolibarr') {
        const [dolibarrClient] = await dolibarrDb.query(
          `SELECT 
            rowid as id,
            nom as name,
            email
          FROM llx_societe 
          WHERE rowid = ?`,
          [numericId]
        );

        if (!dolibarrClient || dolibarrClient.length === 0) {
          throw new Error('Dolibarr client not found');
        }

        client_id = numericId;
        clientDetails = {
          id: `dolibarr-${dolibarrClient[0].id}`,
          name: dolibarrClient[0].name,
          email: dolibarrClient[0].email || ''
        };
      } else {
        const [erpClient] = await connection.query(
          `SELECT 
            id,
            name,
            email
          FROM contacts 
          WHERE id = ?`,
          [numericId]
        );

        if (!erpClient || erpClient.length === 0) {
          throw new Error('ERP client not found');
        }

        client_id = numericId;
        clientDetails = {
          id: `erp-${erpClient[0].id}`,
          name: erpClient[0].name,
          email: erpClient[0].email || ''
        };
      }
    }

    // Verify journal exists
    const [journal] = await connection.query(
      'SELECT id, code, name FROM journals WHERE id = ?',
      [journalId]
    );
    if (!journal.length) {
      throw new Error('Journal not found');
    }

    // Verify account exists
    const [account] = await connection.query(
      'SELECT id, code, name FROM accounts WHERE id = ?',
      [accountId]
    );
    if (!account.length) {
      throw new Error('Account not found');
    }

    // Calculate total
    const total = entries.reduce((sum, entry) => sum + (entry.debit || entry.credit || 0), 0);

    // Insert transaction
    const [result] = await connection.query(
      `INSERT INTO transactions (
        date,
        journal_id,
        document_number,
        invoice_number,
        reference,
        account_id,
        contact_id,
        description,
        due_date,
        status,
        total,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW(), NOW())`,
      [
        date,
        journalId,
        documentNumber || null,
        invoiceNumber || null,
        reference || null,
        accountId,
        client_id,
        description || null,
        dueDate || null,
        total
      ]
    );

    // Insert transaction entries
    for (const entry of entries) {
      await connection.query(
        `INSERT INTO transaction_entries (
          transaction_id,
          debit,
          credit,
          description
        ) VALUES (?, ?, ?, ?)`,
        [
          result.insertId,
          entry.debit || 0,
          entry.credit || 0,
          entry.description || ''
        ]
      );
    }

    await connection.commit();

    // Get created transaction with entries
    const [newTransactionRows] = await connection.query(`
      SELECT 
        t.id,
        t.date,
        t.journal_id,
        j.code as journalCode,
        j.name as journalName,
        t.document_number,
        t.invoice_number,
        t.reference,
        t.account_id,
        a.code as accountCode,
        a.name as accountName,
        t.contact_id,
        t.description,
        t.due_date,
        t.status,
        t.total,
        e.id as entryId,
        e.debit,
        e.credit,
        e.description as entryDescription
      FROM transactions t
      JOIN journals j ON t.journal_id = j.id
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN transaction_entries e ON t.id = e.transaction_id
      WHERE t.id = ?
      ORDER BY e.id ASC
    `, [result.insertId]);

    // Format response
    const transaction = {
      id: `erp-${newTransactionRows[0].id}`,
      date: newTransactionRows[0].date,
      journalId: newTransactionRows[0].journal_id,
      journalCode: newTransactionRows[0].journalCode,
      journalName: newTransactionRows[0].journalName,
      documentNumber: newTransactionRows[0].document_number || '',
      invoiceNumber: newTransactionRows[0].invoice_number || '',
      reference: newTransactionRows[0].reference || '',
      accountId: newTransactionRows[0].account_id,
      accountCode: newTransactionRows[0].accountCode,
      accountName: newTransactionRows[0].accountName,
      contactId: clientDetails.id,
      contactName: clientDetails.name,
      contactEmail: clientDetails.email,
      description: newTransactionRows[0].description || '',
      dueDate: newTransactionRows[0].due_date,
      status: newTransactionRows[0].status,
      total: parseFloat(newTransactionRows[0].total) || 0,
      entries: newTransactionRows
        .filter(row => row.entryId)
        .map(row => ({
          id: row.entryId,
          debit: parseFloat(row.debit) || 0,
          credit: parseFloat(row.credit) || 0,
          description: row.entryDescription || ''
        }))
    };

    res.json(transaction);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/transactions/:id
app.put('/api/transactions/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      date,
      documentNumber,
      invoiceNumber,
      reference,
      contactId,
      description,
      dueDate,
      entries
    } = req.body;

    // Log pour déboguer la requête entrante
    console.log('PUT /api/transactions/:id - Params:', req.params);
    console.log('PUT /api/transactions/:id - Body:', req.body);

    // Validate required fields with specific error messages
    const missingFields = [];
    if (!date || typeof date !== 'string') missingFields.push('date');
    if (!entries) {
      missingFields.push('entries');
    } else if (!Array.isArray(entries)) {
      throw new Error('Invalid format: entries must be an array');
    } else if (entries.length === 0) {
      throw new Error('Invalid format: entries array cannot be empty');
    }

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate entries format
    for (const entry of entries) {
      if (!entry.hasOwnProperty('debit') && !entry.hasOwnProperty('credit')) {
        throw new Error('Each entry must have at least a debit or credit value');
      }
      if (entry.debit && isNaN(parseFloat(entry.debit))) {
        throw new Error('Invalid debit value in entries');
      }
      if (entry.credit && isNaN(parseFloat(entry.credit))) {
        throw new Error('Invalid credit value in entries');
      }
    }

    // Verify transaction exists
    const [transaction] = await connection.query(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );
    console.log('Transaction check:', transaction);
    if (!transaction.length) {
      throw new Error('Transaction not found');
    }

    // Verify contact exists if provided
    if (contactId) {
      const [contact] = await connection.query(
        'SELECT id FROM contacts WHERE id = ?',
        [contactId]
      );
      console.log('Contact check:', contact);
      if (!contact.length) {
        throw new Error('Contact not found');
      }
    }

    // Calculate total
    const total = entries.reduce((sum, entry) => {
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      return sum + (debit > 0 ? debit : credit);
    }, 0);
    console.log('Calculated total:', total);

    // Update transaction
    const updateResult = await connection.query(
      `UPDATE transactions SET
        date = ?,
        document_number = ?,
        invoice_number = ?,
        reference = ?,
        contact_id = ?,
        description = ?,
        due_date = ?,
        total = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        date,
        documentNumber || null,
        invoiceNumber || null,
        reference || null,
        contactId || null,
        description || null,
        dueDate || null,
        total,
        id
      ]
    );
    console.log('Update transaction result:', updateResult);

    // Delete existing transaction entries
    const deleteResult = await connection.query(
      'DELETE FROM transaction_entries WHERE transaction_id = ?',
      [id]
    );
    console.log('Delete entries result:', deleteResult);

    // Insert new transaction entries
    for (const entry of entries) {
      const insertResult = await connection.query(
        `INSERT INTO transaction_entries (
          transaction_id,
          debit,
          credit,
          description
        ) VALUES (?, ?, ?, ?)`,
        [
          id,
          parseFloat(entry.debit) || 0,
          parseFloat(entry.credit) || 0,
          entry.description || ''
        ]
      );
      console.log('Insert entry result:', insertResult);
    }

    await connection.commit();

    // Get updated transaction with entries
    const [updatedTransactionRows] = await connection.query(`
      SELECT 
        t.id,
        t.date,
        t.document_number,
        t.invoice_number,
        t.reference,
        t.contact_id,
        t.description,
        t.due_date,
        t.status,
        t.total,
        e.id as entryId,
        e.debit,
        e.credit,
        e.description as entryDescription
      FROM transactions t
      LEFT JOIN transaction_entries e ON t.id = e.transaction_id
      WHERE t.id = ?
      ORDER BY e.id ASC
    `, [id]);
    console.log('Updated transaction rows:', updatedTransactionRows);

    // Format response
    const transactionResponse = {
      id: updatedTransactionRows[0].id,
      date: updatedTransactionRows[0].date,
      documentNumber: updatedTransactionRows[0].document_number || '',
      invoiceNumber: updatedTransactionRows[0].invoice_number || '',
      reference: updatedTransactionRows[0].reference || '',
      contactId: updatedTransactionRows[0].contact_id,
      description: updatedTransactionRows[0].description || '',
      dueDate: updatedTransactionRows[0].dueDate,
      status: updatedTransactionRows[0].status,
      total: parseFloat(updatedTransactionRows[0].total) || 0,
      entries: updatedTransactionRows
        .filter(row => row.entryId)
        .map(row => ({
          id: row.entryId,
          debit: parseFloat(row.debit) || 0,
          credit: parseFloat(row.credit) || 0,
          description: row.entryDescription || ''
        }))
    };

    res.json(transactionResponse);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction', message: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Verify transaction exists
    const [transaction] = await connection.query(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );
    if (!transaction.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Delete transaction entries
    await connection.query(
      'DELETE FROM transaction_entries WHERE transaction_id = ?',
      [id]
    );

    // Delete transaction
    await connection.query(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction', message: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Check Encashments API
app.get('/api/check-encashments', async (req, res) => {
  try {
    const [rows] = await erpDb.query(`
      SELECT 
        ce.*,
        c.name as supplier_name
      FROM check_encashments ce
      JOIN contacts c ON ce.supplier_id = c.id
      ORDER BY ce.due_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching check encashments:', error);
    res.status(500).json({ error: 'Failed to fetch check encashments' });
  }
});

app.post('/api/check-encashments', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      supplier_id,
      bank_name,
      due_date,
      amount,
      status,
      check_number,
      comment
    } = req.body;

    // Extract numeric ID from supplier_id (e.g. 'erp-1' -> 1)
    const numericSupplierId = parseInt(supplier_id.split('-')[1], 10);

    if (isNaN(numericSupplierId)) {
      throw new Error('Invalid supplier ID format');
    }

    // Verify supplier exists
    const [supplier] = await connection.query(
      'SELECT id FROM contacts WHERE id = ?',
      [numericSupplierId]
    );

    if (!supplier.length) {
      throw new Error('Supplier not found');
    }

    // Insert check encashment
    const [result] = await connection.query(
      `INSERT INTO check_encashments (
        supplier_id,
        bank_name,
        due_date,
        amount,
        status,
        check_number,
        comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        numericSupplierId,
        bank_name,
        due_date,
        amount,
        status,
        check_number,
        comment
      ]
    );

    await connection.commit();

    // Get created check encashment with supplier name
    const [newCheckEncashment] = await connection.query(`
      SELECT 
        ce.*,
        c.name as supplier_name
      FROM check_encashments ce
      JOIN contacts c ON ce.supplier_id = c.id
      WHERE ce.id = ?
    `, [result.insertId]);

    res.json(newCheckEncashment[0]);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating check encashment:', error);
    res.status(500).json({ 
      error: 'Failed to create check encashment',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/check-encashments/:id/status', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    // Update check encashment status
    await connection.query(
      'UPDATE check_encashments SET status = ? WHERE id = ?',
      [status, id]
    );

    await connection.commit();

    // Get updated check encashment
    const [updatedCheckEncashment] = await connection.query(`
      SELECT 
        ce.*,
        c.name as supplier_name
      FROM check_encashments ce
      JOIN contacts c ON ce.supplier_id = c.id
      WHERE ce.id = ?
    `, [id]);

    res.json(updatedCheckEncashment[0]);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating check encashment status:', error);
    res.status(500).json({ 
      error: 'Failed to update check encashment status',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Tickets API
app.get('/api/tickets', async (req, res) => {
  try {
    const [rows] = await erpDb.query(`
      SELECT 
        t.*,
        GROUP_CONCAT(tt.tag) as tags
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    // Transform tags from comma-separated string to array
    const tickets = rows.map(ticket => ({
      ...ticket,
      tags: ticket.tags ? ticket.tags.split(',') : []
    }));

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.post('/api/tickets', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const {
      title,
      description,
      type,
      priority,
      status,
      assignee,
      reporter,
      due_date,
      tags
    } = req.body;

    // Insert ticket
    const [result] = await connection.query(
      `INSERT INTO tickets (
        title,
        description,
        type,
        priority,
        status,
        assignee,
        reporter,
        due_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        description,
        type,
        priority,
        status,
        assignee || null,
        reporter,
        due_date || null
      ]
    );

    // Insert tags if any
    if (tags && tags.length > 0) {
      const tagValues = tags.map(tag => [result.insertId, tag]);
      await connection.query(
        'INSERT INTO ticket_tags (ticket_id, tag) VALUES ?',
        [tagValues]
      );
    }

    await connection.commit();

    // Get created ticket with tags
    const [newTicket] = await connection.query(`
      SELECT 
        t.*,
        GROUP_CONCAT(tt.tag) as tags
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [result.insertId]);

    // Transform tags from comma-separated string to array
    const ticket = {
      ...newTicket[0],
      tags: newTicket[0].tags ? newTicket[0].tags.split(',') : []
    };

    res.json(ticket);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating ticket:', error);
    res.status(500).json({ 
      error: 'Failed to create ticket',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      title,
      description,
      type,
      priority,
      status,
      assignee,
      due_date,
      tags
    } = req.body;

    // Update ticket
    await connection.query(
      `UPDATE tickets SET
        title = ?,
        description = ?,
        type = ?,
        priority = ?,
        status = ?,
        assignee = ?,
        due_date = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        title,
        description,
        type,
        priority,
        status,
        assignee || null,
        due_date || null,
        id
      ]
    );

    // Update tags
    await connection.query('DELETE FROM ticket_tags WHERE ticket_id = ?', [id]);
    if (tags && tags.length > 0) {
      const tagValues = tags.map(tag => [id, tag]);
      await connection.query(
        'INSERT INTO ticket_tags (ticket_id, tag) VALUES ?',
        [tagValues]
      );
    }

    await connection.commit();

    // Get updated ticket with tags
    const [updatedTicket] = await connection.query(`
      SELECT 
        t.*,
        GROUP_CONCAT(tt.tag) as tags
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);

    // Transform tags from comma-separated string to array
    const ticket = {
      ...updatedTicket[0],
      tags: updatedTicket[0].tags ? updatedTicket[0].tags.split(',') : []
    };

    res.json(ticket);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating ticket:', error);
    res.status(500).json({ 
      error: 'Failed to update ticket',
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  let connection;
  try {
    connection = await erpDb.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;

    // Delete ticket tags first (due to foreign key constraint)
    await connection.query('DELETE FROM ticket_tags WHERE ticket_id = ?', [id]);

    // Delete ticket
    await connection.query('DELETE FROM tickets WHERE id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Nouvel endpoint pour récupérer la trésorerie
app.get('/api/treasury', async (req, res) => {
  try {
    const [rows] = await dolibarrDb.query(`
      SELECT ba.rowid, ba.label, COALESCE(SUM(b.amount), 0) as solde
      FROM llx_bank_account ba
      LEFT JOIN llx_bank b ON ba.rowid = b.fk_account
      WHERE ba.entity = 1
      GROUP BY ba.rowid, ba.label
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération de la trésorerie:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la trésorerie' });
  }
});

// Test connections but don't block server start
testConnections();

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});