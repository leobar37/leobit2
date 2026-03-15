import { ElectricService } from "./src/services/business/electric.service";
import { RequestContext } from "./src/context/request-context";

const service = new ElectricService();
const ctx = RequestContext.forWorker("a2950eca-4c3f-473b-9e9d-3cb951e4f4ad", "test-user");

async function test() {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("table", "products");
    searchParams.set("offset", "0_0");
    searchParams.set("where", "business_id = 'a2950eca-4c3f-473b-9e9d-3cb951e4f4ad'");

    const result = await service.proxyShape(ctx, {
      table: "products",
      searchParams,
      accept: "*/*",
    });
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
