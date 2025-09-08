import platform
import uvicorn
from fastmcp import FastMCP, Client
import asyncio

# Create an instance of the FastMCP server
mcp = FastMCP(name="My First MCP Server")

@mcp.tool()
def greet(name: str) -> str:
    """Returns a simple greeting."""
    return f"Hello, {name}!"

@mcp.tool()
def add(a: int, b: int) -> int:
    """Adds two numbers together."""
    return a + b

print("Tools 'greet' and 'add' added.")
# It's good practice to run the server using a conditional
# so the file can be imported by other modules if needed.
if __name__ == "__main__":
    # Uvicorn is a lightning-fast ASGI server, used to run the FastAPI app.
    uvicorn.run(app, host="0.0.0.0", port=8000)