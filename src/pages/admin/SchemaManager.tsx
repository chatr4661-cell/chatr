import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Database, Play, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SchemaManager = () => {
  const [sql, setSql] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      // Use raw SQL to get table names from information_schema
      const { data, error } = await supabase.rpc('get_all_tables' as any);

      if (error) {
        console.error('Error loading tables:', error);
        return;
      }
      
      setTables(data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const executeSQL = async () => {
    if (!sql.trim()) {
      toast.error("Please enter SQL code");
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      // Note: This would require a custom RPC function to execute arbitrary SQL
      // For now, we'll just show a message
      toast.info("SQL execution requires custom database function. Use Lovable Cloud dashboard to run migrations.");
      setResult({ 
        success: false, 
        error: "Direct SQL execution not available. Use the migration tool or Lovable Cloud dashboard." 
      });
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      toast.error(error.message || "Failed to execute SQL");
    } finally {
      setExecuting(false);
    }
  };

  const sqlTemplates = [
    {
      name: "Create Table",
      sql: `CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON example_table
  FOR SELECT
  USING (auth.uid() = user_id);`
    },
    {
      name: "Add Column",
      sql: `ALTER TABLE table_name
ADD COLUMN new_column TEXT;`
    },
    {
      name: "Create Index",
      sql: `CREATE INDEX idx_table_column
ON table_name(column_name);`
    },
    {
      name: "Enable RLS",
      sql: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);`
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Database Schema Manager
        </h1>
        <p className="text-muted-foreground mt-1">Execute SQL queries and manage your database</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Warning: Be careful with SQL operations. Always backup your data before making schema changes.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SQL Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">SQL Query</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTables}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Tables
                </Button>
              </div>

              <Textarea
                placeholder="Enter your SQL query here..."
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />

              <Button
                onClick={executeSQL}
                disabled={executing}
                className="w-full"
                size="lg"
              >
                {executing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute SQL
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results */}
          {result && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Result</h3>
              <pre className={`p-4 rounded-lg overflow-x-auto ${
                result.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
              }`}>
                {JSON.stringify(result.success ? result.data : result.error, null, 2)}
              </pre>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Current Tables */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Current Tables ({tables.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tables.map((table) => (
                <div
                  key={table}
                  className="text-sm p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer"
                  onClick={() => setSql(`SELECT * FROM ${table} LIMIT 10;`)}
                >
                  {table}
                </div>
              ))}
            </div>
          </Card>

          {/* SQL Templates */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">SQL Templates</h3>
            <div className="space-y-2">
              {sqlTemplates.map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => setSql(template.sql)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchemaManager;
