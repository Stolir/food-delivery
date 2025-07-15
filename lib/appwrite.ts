import { CreateUserParams, GetMenuParams, SignInParams } from "@/type";
import { Account, Avatars, Client, Databases, ID, Query, Storage } from "react-native-appwrite";

export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectid: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    platform: "com.stolir.fooddelivery",
    databaseId: "686fb902001bcc2f8ce1",
    bucketId: "6873b636001f6ea7f4d1",
    userCollectionId: "686fb944000c94d71e6f",
    categoriesCollectionId: "6873b37300361a4a1e50",
    menuCollectionId: "6873b3e60002ebc7e203",
    customizationsCollectionId: "6873b4b90000302876f5",
    menuCustomizationsCollectionId: "6873b561001d175b923a",
}
export const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectid)
    .setPlatform(appwriteConfig.platform)

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client)
const avatars = new Avatars(client);

export const createUser = async({email, password, name}: CreateUserParams) => {
    try {
        const newAccount = await account.create(ID.unique(), email, password, name)
        if(!newAccount) throw Error;

        await signIn({ email, password});

        const avatarUrl = avatars.getInitialsURL(name)

        return await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId, 
            ID.unique(),
            { email, name, accountId: newAccount.$id, avatar: avatarUrl }
        );
    } catch (e) {
        throw new Error(e as string)
    }
}

export const signIn = async ({ email, password }: SignInParams) => {
    try {
        const session = await account.createEmailPasswordSession(email, password)
    } catch (e) {
        throw new Error(e as string)
    }
}

export const getCurrentUser = async() => {
    try {
        const currentAccount = await account.get();
        if(!currentAccount) throw Error;
        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        )

        if (!currentUser) throw Error;
        return currentUser.documents[0];
    } catch(e) {
        console.log(e)
        throw new Error(e as string)
    }
}

export const getMenu = async ({ category, query, limit }: GetMenuParams) => {
    try {
        const queries: string[] = [];

        if(category) queries.push(Query.equal('categories', category))
        if(query) queries.push(Query.search('name', query))
        // if(limit) queries.push(Query.limit(Number(limit)));

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries,
        )

        return menus.documents;
    } catch (e) {
        throw new Error(e as string)
    }
} 

export const getCategories = async () => {
    try {
        const categories = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId,
        )
    } catch (e) {
        throw new Error(e as string)
    }
}