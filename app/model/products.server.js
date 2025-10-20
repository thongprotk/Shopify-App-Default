export const getProducts = async (admin) => {

    const response = await admin(`
        query GetAllProducts($first: Int = 50, $after: String) {
            products(first: $first, after: $after) {
                edges {
                    node {
                        id
                        legacyResourceId
                        title
                        description
                        handle
                        productType
                        vendor
                        tags
                        status
                        createdAt
                        updatedAt
                        
                        featuredImage {
                            id
                            url
                            altText
                        }
                        
                        images(first: 5) {
                            edges {
                                node {
                                    id
                                    url
                                    altText
                                }
                            }
                        }
                        
                        variants(first: 10) {
                            edges {
                                node {
                                    id
                                    legacyResourceId
                                    title
                                    sku
                                    barcode
                                    price
                                    compareAtPrice
                                    inventoryQuantity
                                    availableForSale
                                    
                                    selectedOptions {
                                        name
                                        value
                                    }
                                    
                                    image {
                                        url
                                        altText
                                    }
                                }
                            }
                        }
                        
                        priceRangeV2 {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                            maxVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        
                        options {
                            id
                            name
                            values
                        }
                        
                        seo {
                            title
                            description
                        }
                        
                        collections(first: 5) {
                            edges {
                                node {
                                    id
                                    title
                                    handle
                                }
                            }
                        }
                        
                        totalInventory
                        totalVariants
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    endCursor
                    startCursor
                }
            }
        }
    `,
    );
    try {
        const responseJson = await response.json();
        if (responseJson.errors) {
            throw new Error('Failed to fetch products');
        }
        return responseJson.data.products.edges;
    } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Failed to fetch products');
    }
};

// Hàm riêng để lấy products theo tags cụ thể
export const getProductsByTags = async (props) => {
    const { admin, tags } = props;

    const tagQuery = tags ? `tag:${tags.join(' OR tag:')}` : '';

    const response = await admin.graphql(`
        query GetProductsByTags($query: String, $first: Int = 50) {
            products(query: $query, first: $first) {
                edges {
                    node {
                        id
                        title
                        handle
                        tags
                        featuredImage {
                            url
                            altText
                        }
                        priceRangeV2 {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    `, {
        variables: {
            query: tagQuery,
            first: 50
        }
    });

    const responseJson = await response.json();
    return responseJson.data.products;
};

