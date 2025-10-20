import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getProducts } from "../model/Products.server";
import {
  IndexTable,
  LegacyCard,
  useIndexResourceState,
  Text,
  Badge,
  Thumbnail,
  Button,
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  TextContainer,
  ButtonGroup,
  Pagination,
  IndexFilters,
  useSetIndexFiltersMode,
  ChoiceList,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // const mutations = new ProductMutations(admin.graphql);
  const products = await getProducts(admin.graphql);
  return { products, admin };
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const { ProductMutations } = await import("../model/productMutation.server");
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const productId = formData.get("productId");

  try {
    if (actionType === "update") {
      console.log(formData);
      const productInput = {
        title: formData.get("title"),
        descriptionHtml: formData.get("descriptionHtml"),
        productType: formData.get("productType"),
        vendor: formData.get("vendor"),
        status: formData.get("status"),
        tags:
          formData.get("tags") && formData.get("tags").trim() !== ""
            ? formData
                .get("tags")
                .split(",")
                .map((tag) => tag.trim())
            : [],
      };
      await ProductMutations.updateProduct(admin, productId, productInput);
      return { success: true, message: "Product updated successfully" };
    }
    if (actionType === "delete") {
      await ProductMutations.deleteProduct(admin, productId);
      return { success: true, message: "Product deleted successfully" };
    }
    if (actionType === "create") {
      const productInput = {
        title: formData.get("title"),
        descriptionHtml: formData.get("descriptionHtml"),
        productType: formData.get("productType"),
        vendor: formData.get("vendor"),
        status: formData.get("status"),
        tags: formData.get("tags"),
      };
      await ProductMutations.createProduct(admin, productInput);
      return { success: true, message: "Product created successfully" };
    }
  } catch (error) {
    console.error("Error processing form data:", error);
  }
}

export default function ProductsPage() {
  const { products } = useLoaderData();
  const [indexPage, setIndexPage] = useState(1);

  const [filterQuery, setFilterQuery] = useState("");
  const [sortSelected, setSortSelected] = useState(["updated_at desc"]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [itemStrings, setItemStrings] = useState([
    "Tất cả",
    "Active",
    "Draft",
    "Archived",
  ]);

  const fetcher = useFetcher();
  const app = useAppBridge();
  // Transform products data for the table
  const productList = products?.map((edge) => edge.node) || [];

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value);
    setIndexPage(1);
  }, []);

  let filterProducts = productList.filter((product) => {
    const matchQuery = product.title
      .toLowerCase()
      .includes(filterQuery.toLowerCase());
    const matchStatus =
      statusFilter.length === 0 || statusFilter.includes(product.status);
    return matchQuery && matchStatus;
  });
  if (sortSelected[0]) {
    filterProducts = [...filterProducts].sort((a, b) => {
      switch (sortSelected[0]) {
        case "title asc":
          return a.title.localeCompare(b.title);
        case "title desc":
          return b.title.localeCompare(a.title);
        case "updated_at asc":
          return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "updated_at desc":
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case "price asc":
          return (
            parseFloat(a.priceRangeV2?.minVariantPrice?.amount || 0) -
            parseFloat(b.priceRangeV2?.minVariantPrice?.amount || 0)
          );
        case "price desc":
          return (
            parseFloat(b.priceRangeV2?.minVariantPrice?.amount || 0) -
            parseFloat(a.priceRangeV2?.minVariantPrice?.amount || 0)
          );
        default:
          return 0;
      }
    });
  }

  const productsPerPage = 5;
  const totalProducts = filterProducts.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);

  const indexOfLastProduct = indexPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filterProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );

  const handlePageChange = (newPage) => {
    setIndexPage(newPage);
  };
  const handlePreviousPage = () => {
    if (indexPage > 1) {
      setIndexPage(indexPage - 1);
    }
  };
  const handleNextPage = () => {
    if (indexPage < totalPages) {
      setIndexPage(indexPage + 1);
    }
  };

  const handleFilterQueryChange = useCallback((value) => {
    setFilterQuery(value);
    setIndexPage(1);
  }, []);

  const handleFilterClearAll = useCallback(() => {
    setFilterQuery("");
    setStatusFilter([]);
    setIndexPage(1);
  }, []);

  const handleSortQueryChange = useCallback((value) => {
    setSortSelected(value);
    setIndexPage(1);
  }, []);

  const onActionCancel = () => {};
  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelected(selectedTabIndex);
    setIndexPage(1);

    // Update status filter based on selected tab
    switch (selectedTabIndex) {
      case 0:
        setStatusFilter([]);
        break;
      case 1:
        setStatusFilter(["ACTIVE"]);
        break;
      case 2:
        setStatusFilter(["DRAFT"]);
        break;
      case 3:
        setStatusFilter(["ARCHIVED"]);
        break;
      default:
        setStatusFilter([]);
    }
  }, []);
  const deleteView = (index) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };

  const duplicateView = async (name) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };
  const onCreateNewView = useCallback(
    (value) => {
      console.log("Create new view with filter:", value);
      const newItemStrings = [
        ...itemStrings,
        value || `View ${itemStrings.length + 1}`,
      ];
      setItemStrings(newItemStrings);
      setSelected(newItemStrings.length - 1);
      setFilterQuery(value || "");
      setIndexPage(1);
      return Promise.resolve(true);
    },
    [itemStrings],
  );

  const primaryAction =
    selected === 0
      ? {
          type: "save-as",
          onAction: () => onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save",
          onAction: () => onCreateNewView,
          disabled: false,
          loading: false,
        };
  //toast message to show success or error
  const showToast = (message, isError = false) => {
    app.toast.show(message, {
      duration: 5000,
      isError: isError,
    });
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(productList);
  // Modal states
  const [editModalActive, setEditModalActive] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [createModalActive, setCreateModalActive] = useState(false);
  // Form data for editing
  const [formData, setFormData] = useState({
    title: "",
    descriptionHtml: "",
    productType: "",
    vendor: "",
    status: "ACTIVE",
    tags: "",
    actionType: "",
  });

  // Modal handlers
  const handleEditModal = useCallback(
    () => setEditModalActive(!editModalActive),
    [editModalActive],
  );
  const handleDeleteModal = useCallback(
    () => setDeleteModalActive(!deleteModalActive),
    [deleteModalActive],
  );
  const handleCreateModal = useCallback(
    () => setCreateModalActive(!createModalActive),
    [createModalActive],
  );
  // Create product handler
  const handleCreateProduct = useCallback(() => {
    setFormData({
      title: "",
      descriptionHtml: "",
      productType: "",
      vendor: "",
      status: "ACTIVE",
      tags: "",
      actionType: "create",
    });
    setCreateModalActive(true);
  }, []);
  const handleSaveCreate = useCallback(() => {
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("actionType", formData.actionType || "create");
    formDataToSubmit.append("title", formData.title);
    formDataToSubmit.append("descriptionHtml", formData.descriptionHtml);
    formDataToSubmit.append("productType", formData.productType);
    formDataToSubmit.append("vendor", formData.vendor);
    formDataToSubmit.append("status", formData.status);
    formDataToSubmit.append("tags", formData.tags);
    fetcher.submit(formDataToSubmit, { method: "post" });
    setCreateModalActive(false);
    setSelectedProduct(null);
  }, [formData, fetcher]);

  // Edit product handler
  const handleEditProduct = useCallback(() => {
    if (selectedResources.length === 1) {
      const product = productList.find((p) => p.id === selectedResources[0]);
      if (product) {
        setSelectedProduct(product);
        setFormData({
          title: product.title || "",
          descriptionHtml: product.descriptionHtml || "",
          productType: product.productType || "",
          vendor: product.vendor || "",
          status: product.status || "ACTIVE",
          tags: product.tags ? product.tags.join(", ") : "",
          actionType: "update",
        });
        setEditModalActive(true);
      }
    }
  }, [selectedResources, productList]);
  useEffect(() => {
    if (fetcher.data && fetcher.data.success) {
      showToast(fetcher.data.message);
    } else if (fetcher.data && !fetcher.data.success) {
      showToast("An error occurred. Please try again.", true);
    }
  }, [fetcher.data]);

  // Delete product handler
  const handleDeleteProduct = useCallback(() => {
    if (selectedResources.length === 1) {
      const product = productList.find((p) => p.id === selectedResources[0]);
      if (product) {
        setSelectedProduct(product);
        setFormData((prev) => ({
          ...prev,
          actionType: "delete",
        }));
        setDeleteModalActive(true);
      }
    }
  }, [selectedResources, productList]);

  // Form field handlers
  const handleFormChange = useCallback(
    (field) => (value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Save edit handler
  const handleSaveEdit = useCallback(() => {
    if (!selectedProduct) return;
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("actionType", formData.actionType || "update");
    formDataToSubmit.append("productId", selectedProduct.id);
    formDataToSubmit.append("title", formData.title);
    formDataToSubmit.append("descriptionHtml", formData.descriptionHtml);
    formDataToSubmit.append("productType", formData.productType);
    formDataToSubmit.append("vendor", formData.vendor);
    formDataToSubmit.append("status", formData.status);
    formDataToSubmit.append("tags", formData.tags);
    fetcher.submit(formDataToSubmit, { method: "post" });
    setEditModalActive(false);
    setSelectedProduct(null);
  }, [selectedProduct, formData, fetcher]);

  // Confirm delete handler
  const handleConfirmDelete = useCallback(() => {
    if (!selectedProduct) return;
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("actionType", formData.actionType || "delete");
    formDataToSubmit.append("productId", selectedProduct.id);
    fetcher.submit(formDataToSubmit, { method: "post" });
    setDeleteModalActive(false);
    setSelectedProduct(null);
  }, [selectedProduct]);

  const formatPrice = (priceRange) => {
    if (!priceRange?.minVariantPrice?.amount) return "N/A";
    const min = parseFloat(priceRange.minVariantPrice.amount);
    const max = parseFloat(priceRange.maxVariantPrice.amount);
    const currency = priceRange.minVariantPrice.currencyCode || "USD";

    if (min === max) {
      return `$${min.toFixed(2)} ${currency}`;
    }
    return `$${min.toFixed(2)} - $${max.toFixed(2)} ${currency}`;
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge tone="success">Active</Badge>;
      case "DRAFT":
        return <Badge tone="info">Draft</Badge>;
      case "ARCHIVED":
        return <Badge tone="warning">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  const getTagsBadge = (tags) => {
    if (!tags || tags.length === 0) return <Badge tone="info">N/A</Badge>;
    return <Badge tone="info">{tags.join(", ")}</Badge>;
  };
  const sortOptions = [
    { label: "Tên sản phẩm", value: "title asc", directionLabel: "A → Z" },
    { label: "Tên sản phẩm", value: "title desc", directionLabel: "Z → A" },
    {
      label: "Ngày cập nhật (mới nhất)",
      value: "updated_at desc",
      directionLabel: "Mới nhất",
    },
    {
      label: "Ngày cập nhật (cũ nhất)",
      value: "updated_at asc",
      directionLabel: "Cũ nhất",
    },
  ];

  const filter = [
    {
      key: "status",
      label: "Trạng thái",
      filter: (
        <ChoiceList
          title="Satus"
          titleHidden
          choices={[
            { label: "Active", value: "ACTIVE" },
            { label: "Draft", value: "DRAFT" },
            { label: "Archived", value: "ARCHIVED" },
          ]}
          selected={statusFilter}
          onChange={handleStatusFilterChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];
  const appliedFilters =
    statusFilter.length > 0
      ? [
          {
            key: "status",
            label: `Trạng thái: ${statusFilter.join(", ")}`,
            onRemove: () => setStatusFilter([]),
          },
        ]
      : [];
  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => handleTabChange(index),
    id: `${item}-${index}`,
    isBlock: index === 0,
    actions:
      index !== 0
        ? []
        : [
            {
              type: "rename",
              onAction: () => {},
              onPrimaryAction: async (value) => {
                const newItemsStrings = tabs.map((item, idx) => {
                  if (idx === index) {
                    return value;
                  }
                  return item.content;
                });
                await sleep(1);
                setItemStrings(newItemsStrings);
                return true;
              },
            },
            {
              type: "duplicate",
              onPrimaryAction: async (value) => {
                await sleep(1);
                duplicateView(value);
                return true;
              },
            },
            {
              type: "edit",
            },
            {
              type: "delete",
              onPrimaryAction: async () => {
                await sleep(1);
                deleteView(index);
                return true;
              },
            },
          ],
  }));
  const rowMarkup = currentProducts.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      selected={selectedResources.includes(product.id)}
      position={index}
    >
      <IndexTable.Cell>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Thumbnail
            source={product.featuredImage?.url || ""}
            alt={product.featuredImage?.altText || product.title}
            size="small"
          />
          <div>
            <Text variant="bodyMd" fontWeight="bold" as="div">
              {product.title}
            </Text>
            <Text variant="bodySm" color="subdued" as="div">
              {product.ids}
            </Text>
          </div>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>{getStatusBadge(product.status)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{getTagsBadge(product.tags)}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" alignment="end" numeric>
          {formatPrice(product.priceRangeV2)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" alignment="center" numeric>
          {product.totalInventory || 0}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{formatDate(product.updatedAt)}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // Status options for select
  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Draft", value: "DRAFT" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  return (
    <>
      <LegacyCard>
        {selectedResources.length === 1 && (
          <div style={{ padding: "16px", borderBottom: "1px solid #e1e3e5" }}>
            <ButtonGroup>
              <Button onClick={handleEditProduct}>Sửa sản phẩm</Button>
              <Button destructive onClick={handleDeleteProduct}>
                Xóa sản phẩm
              </Button>
            </ButtonGroup>
          </div>
        )}
        <ButtonGroup>
          <Button onClick={handleCreateProduct}>Tạo sản phẩm</Button>
        </ButtonGroup>
        <IndexFilters
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={filterQuery}
          queryPlaceholder="Tìm kiếm sản phẩm"
          onQueryChange={handleFilterQueryChange}
          onQueryClear={() => setFilterQuery("")}
          onClearAll={handleFilterClearAll}
          onSort={handleSortQueryChange}
          primaryAction={primaryAction}
          cancelAction={{
            disabled: false,
            loading: false,
            onAction: onActionCancel,
          }}
          tabs={tabs}
          selected={selected}
          onSelect={handleTabChange}
          canCreateNewView={true}
          onCreateNewView={onCreateNewView}
          filters={filter}
          appliedFilters={appliedFilters}
          mode={mode}
          setMode={setMode}
        />
        <IndexTable
          resourceName={resourceName}
          itemCount={filterProducts.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Product" },
            { title: "Status" },
            { title: "Tags" },
            { title: "Price", alignment: "end" },
            { title: "Inventory", alignment: "center" },
            { title: "Updated" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              borderTop: "1px solid #e1e3e5",
            }}
          >
            <Text>
              Page {indexPage} of {totalPages}
            </Text>
            <Pagination
              label={`Trang ${indexPage} trên ${totalPages}`}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPrevious={handlePreviousPage}
              hasPrevious={indexPage > 1}
              onNext={handleNextPage}
              hasNext={indexPage < totalPages}
            />
          </div>
        )}
      </LegacyCard>

      {/* Edit Product Modal */}
      <Modal
        open={editModalActive}
        onClose={handleEditModal}
        title="Sửa sản phẩm"
        primaryAction={{
          content: "Lưu thay đổi",
          onAction: handleSaveEdit,
        }}
        secondaryActions={[
          {
            content: "Hủy",
            onAction: handleEditModal,
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSaveEdit}>
            <FormLayout>
              <TextField
                label="Tên sản phẩm"
                value={formData.title}
                onChange={handleFormChange("title")}
                autoComplete="off"
              />

              <TextField
                label="Mô tả"
                value={formData.descriptionHtml}
                onChange={handleFormChange("descriptionHtml")}
                multiline={4}
                autoComplete="off"
              />

              <TextField
                label="Loại sản phẩm"
                value={formData.productType}
                onChange={handleFormChange("productType")}
                autoComplete="off"
              />
              <Select
                label="Trạng thái"
                options={statusOptions}
                value={formData.status}
                onChange={handleFormChange("status")}
              />

              <TextField
                label="Tags (ngăn cách bằng dấu phẩy)"
                value={formData.tags}
                onChange={handleFormChange("tags")}
                autoComplete="off"
                helpText="Ví dụ: thời trang, mùa hè, sale"
              />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
      <Modal
        open={createModalActive}
        onClose={handleCreateModal}
        title="Tạo sản phẩm"
        primaryAction={{
          content: "Tạo sản phẩm",
          onAction: handleSaveCreate,
        }}
        secondaryActions={[
          {
            content: "Hủy",
            onAction: handleCreateModal,
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSaveCreate}>
            <FormLayout>
              <TextField
                label="Tên sản phẩm"
                value={formData.title}
                onChange={handleFormChange("title")}
                autoComplete="off"
              />

              <TextField
                label="Mô tả"
                value={formData.descriptionHtml}
                onChange={handleFormChange("descriptionHtml")}
                multiline={4}
                autoComplete="off"
              />
              <TextField
                label="Nhà cung cấp"
                value={formData.vendor}
                onChange={handleFormChange("vendor")}
                autoComplete="off"
              />
              <TextField
                label="Loại sản phẩm"
                value={formData.productType}
                onChange={handleFormChange("productType")}
                autoComplete="off"
              />
              <TextField
                label="Tags (ngăn cách bằng dấu phẩy)"
                value={formData.tags}
                onChange={handleFormChange("tags")}
                autoComplete="off"
                helpText="Ví dụ: thời trang, mùa hè, sale"
              />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* Delete Product Modal */}
      <Modal
        open={deleteModalActive}
        onClose={handleDeleteModal}
        title="Xóa sản phẩm"
        primaryAction={{
          content: "Xóa",
          onAction: handleConfirmDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Hủy",
            onAction: handleDeleteModal,
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Bạn có chắc chắn muốn xóa sản phẩm{" "}
              <strong>{selectedProduct?.title}</strong>?
            </p>
            <p style={{ color: "#bf0711" }}>
              Hành động này không thể hoàn tác.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </>
  );
}
