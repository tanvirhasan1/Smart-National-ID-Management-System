require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const uri = process.env.MONGODB_URI;
const dbName = "smartnidsystem";

async function seedAdmin() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);

    const adminId = new ObjectId();

    const adminEmail = "subhodhar404@gmail.com";
    const adminPhone = "01710000000";

    // 🔐 Plain password (login এ ব্যবহার করবে)
    const plainPassword = "Admin123456";

    // 🔒 Hash password
    const adminPasswordHash = await bcrypt.hash(plainPassword, 10);

    // 🔍 Check if admin already exists
    const existingUser = await db.collection("users").findOne({
      $or: [{ email: adminEmail }, { phone: adminPhone }],
    });

    if (existingUser) {
      console.log("⚠️ Admin already exists!");
      return;
    }

    // 👤 Insert into users
    await db.collection("users").insertOne({
      _id: adminId,
      fullName: "Main Admin",
      fullNameBangla: "শুভ ধর",
      birthRegNumber: "00000000000000000",
      dateOfBirth: new Date("2000-12-12"),
      gender: "male",
      placeOfBirth: "sylhet",
      email: adminEmail,
      phone: adminPhone,
      password: adminPasswordHash,
      role: "admin",
      permissions: ["*"],
      isVerified: true,
      status: "active",
      presentAddress: {
        division: "",
        district: "",
        upazila: "",
        union: "",
        village: "",
        postCode: "",
      },
      permanentAddress: {
        division: "sylhet",
        district: "sylhet",
        upazila: "syl",
        union: "syl",
        village: "syl",
        postCode: "6969",
      },
      createdBy: null,
      passwordChangedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 👑 Insert into admin_users
    await db.collection("admin_users").insertOne({
      userId: adminId,
      fullName: "Main Admin",
      email: adminEmail,
      phone: adminPhone,
      role: "admin",
      permissions: ["*"],
      status: "active",
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("🎉 Admin seeded successfully!");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", plainPassword);

  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

seedAdmin();