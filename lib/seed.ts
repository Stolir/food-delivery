import { ID } from "react-native-appwrite";
import { appwriteConfig, databases, storage } from "./appwrite";
import dummyData from "./data";

interface Category {
    name: string;
    description: string;
}

interface Customization {
    name: string;
    price: number;
    type: "topping" | "side" | "size" | "crust" | string; // extend as needed
}

interface MenuItem {
    name: string;
    description: string;
    image_url: string;
    price: number;
    rating: number;
    calories: number;
    protein: number;
    category_name: string;
    customizations: string[]; // list of customization names
}

interface DummyData {
    categories: Category[];
    customizations: Customization[];
    menu: MenuItem[];
}

// ensure dummyData has correct shape
const data = dummyData as DummyData;

async function clearAll(collectionId: string): Promise<void> {
    const list = await databases.listDocuments(
        appwriteConfig.databaseId,
        collectionId
    );

    await Promise.all(
        list.documents.map((doc) =>
            databases.deleteDocument(appwriteConfig.databaseId, collectionId, doc.$id)
        )
    );
}

async function clearStorage(): Promise<void> {
    const list = await storage.listFiles(appwriteConfig.bucketId);

    await Promise.all(
        list.files.map((file) =>
            storage.deleteFile(appwriteConfig.bucketId, file.$id)
        )
    );
}

async function uploadImageToStorage(imageUrl: string) {
    try {
        // For React Native, we need to handle the file differently
        const fileId = ID.unique();
        const fileName = imageUrl.split("/").pop() || `file-${Date.now()}.jpg`;

        // Create file directly from URL
        const file = await storage.createFile(
            appwriteConfig.bucketId,
            fileId,
            {
                name: fileName,
                type: 'image/jpeg', // Default to JPEG if type can't be determined
                size: 0, // Size will be determined by Appwrite
                uri: imageUrl,
            }
        );

                                                                return storage.getFileViewURL(appwriteConfig.bucketId, file.$id);
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

async function seed(): Promise<void> {
    try {
        console.log("Starting database seeding...");

        // 1. Clear all
        console.log("Clearing existing data...");
        await clearAll(appwriteConfig.categoriesCollectionId);
        await clearAll(appwriteConfig.customizationsCollectionId);
        await clearAll(appwriteConfig.menuCollectionId);
        await clearAll(appwriteConfig.menuCustomizationsCollectionId);
        await clearStorage();

        // 2. Create Categories
        console.log("Creating categories...");
        const categoryMap: Record<string, string> = {};
        for (const cat of data.categories) {
            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.categoriesCollectionId,
                ID.unique(),
                cat
            );
            categoryMap[cat.name] = doc.$id;
        }

        // 3. Create Customizations
        console.log("Creating customizations...");
        const customizationMap: Record<string, string> = {};
        for (const cus of data.customizations) {
            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.customizationsCollectionId,
                ID.unique(),
                {
                    name: cus.name,
                    price: cus.price,
                    type: cus.type,
                }
            );
            customizationMap[cus.name] = doc.$id;
        }

        // 4. Create Menu Items
        console.log("Creating menu items...");
        const menuMap: Record<string, string> = {};
        for (const item of data.menu) {
            console.log(`Processing menu item: ${item.name}`);
            const uploadedImage = await uploadImageToStorage(item.image_url);

            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                ID.unique(),
                {
                    name: item.name,
                    description: item.description,
                    image_url: uploadedImage,
                    price: item.price,
                    rating: item.rating,
                    calories: item.calories,
                    protein: item.protein,
                    categories: categoryMap[item.category_name],
                }
            );

            menuMap[item.name] = doc.$id;

            // 5. Create menu_customizations
            for (const cusName of item.customizations) {
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCustomizationsCollectionId,
                    ID.unique(),
                    {
                        menu: doc.$id,
                        customizations: customizationMap[cusName],
                    }
                );
            }
        }

        console.log("✅ Seeding complete.");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
}

export default seed;