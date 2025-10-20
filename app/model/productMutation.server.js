export const ProductMutations = {
    createProduct: async (admin, productInput) => {
        const mutation = `
            mutation productCreate($input: ProductInput!) {
                productCreate(input: $input) {
                    product {
                        id
                        title
                        descriptionHtml
                        handle
                        tags
                        vendor
                        status
                        productType
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await admin.graphql(mutation, {
            variables: { input: { ...productInput } },
        });

        const responseJson = await response.json();

        if (responseJson.errors) {
            throw new Error('Failed to create product');
        }
        return responseJson.data.productCreate;
    },

    updateProduct: async (admin, productId, productInput) => {
        const mutation = `
            mutation productUpdate($input: ProductInput!) {
                productUpdate(input: $input) {
                    product {
                        id
                        title
                        descriptionHtml
                        handle
                        productType
                        vendor
                        tags
                        status
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        try {
            const response = await admin.graphql(mutation, {
                variables: { input: { id: productId, ...productInput } },
            });
            const responseJson = await response.json();
            console.log('Update Product Response:', responseJson.data);
        } catch (error) {
            console.error('Error updating product:', error);
        }

    },

    deleteProduct: async (admin, productId) => {
        const mutation = `
            mutation productDelete($input: ProductDeleteInput!) {
                productDelete(input: $input) {
                    deletedProductId
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        try {
            const response = await admin.graphql(mutation, {
                variables: { input: { id: productId } },
            });

            const responseJson = await response.json();
            return responseJson.data.productDelete;

        } catch (error) {
            console.error('err message delete product:', error);
        }

    }
}; 