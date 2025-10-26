import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Database, Play, RefreshCw, AlertCircle, Table, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableInfo {
  table_name: string;
  row_count: number;
}

const SchemaManager = () => {
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaSQL, setSchemaSQL] = useState("");

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      // Get all table names from the public schema
      const allTables = [
        'profiles', 'conversations', 'messages', 'user_roles', 'user_points',
        'point_transactions', 'appointments', 'service_providers', 'payments',
        'official_accounts', 'account_followers', 'announcements', 'contacts',
        'fame_cam_posts', 'fame_leaderboard', 'brand_partnerships', 'brand_impressions',
        'mini_apps', 'business_profiles', 'crm_leads', 'doctor_applications'
      ];

      const tableInfo: TableInfo[] = [];
      
      for (const tableName of allTables) {
        try {
          const { count } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });
          
          tableInfo.push({
            table_name: tableName,
            row_count: count || 0
          });
        } catch (error) {
          // Table might not exist or no access
          console.log(`Skipping table ${tableName}`);
        }
      }

      setTables(tableInfo.sort((a, b) => a.table_name.localeCompare(b.table_name)));
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error("Failed to load tables");
    }
  };

  const viewTableData = async (tableName: string) => {
    if (!tableName) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(100);

      if (error) throw error;

      setTableData(data || []);
      setSelectedTable(tableName);
      toast.success(`Loaded ${data?.length || 0} rows from ${tableName}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to load table data");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const sqlTemplates = {
    createTable: `-- Create a new table with RLS enabled
CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data"
  ON example_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON example_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
  ON example_table FOR UPDATE
  USING (auth.uid() = user_id);`,

    addColumn: `-- Add a new column to existing table
ALTER TABLE table_name 
ADD COLUMN new_column_name TEXT;

-- Add column with default value
ALTER TABLE table_name 
ADD COLUMN new_column_name TEXT DEFAULT 'default_value';`,

    createIndex: `-- Create an index for better query performance
CREATE INDEX idx_table_column 
ON table_name(column_name);

-- Create a unique index
CREATE UNIQUE INDEX idx_unique_email 
ON profiles(email);`,

    createRLS: `-- Enable RLS on existing table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view their own records"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own records"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);`,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Database Schema Manager
        </h1>
        <p className="text-muted-foreground mt-1">View and analyze your database structure</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          To make schema changes, use database migrations in the Lovable Cloud dashboard or migration tool.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tables">Tables & Data</TabsTrigger>
          <TabsTrigger value="templates">SQL Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tables List */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Tables ({tables.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTables}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {tables.map((table) => (
                  <div
                    key={table.table_name}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTable === table.table_name
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => viewTableData(table.table_name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{table.table_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {table.row_count} rows
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Table Data Viewer */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    {selectedTable ? `Table: ${selectedTable}` : 'Select a table to view data'}
                  </h3>
                  {selectedTable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewTableData(selectedTable)}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {selectedTable && tableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(tableData[0]).map((key) => (
                            <th key={key} className="text-left p-2 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            {Object.values(row).map((value: any, vidx) => (
                              <td key={vidx} className="p-2">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selectedTable ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No data in this table
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a table from the list to view its data
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">SQL Templates for Migrations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Copy these templates and use them in the migration tool or Lovable Cloud dashboard
            </p>

            <div className="space-y-4">
              {Object.entries(sqlTemplates).map(([key, sql]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(sql);
                        toast.success("Template copied to clipboard!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{sql}</code>
                  </pre>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchemaManager;
