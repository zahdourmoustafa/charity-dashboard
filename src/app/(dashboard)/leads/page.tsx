"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function LeadsPage() {
  const leads = useQuery(api.leads.list);

  if (leads === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            {leads.length} {leads.length === 1 ? "employee" : "employees"} in the system
          </p>
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Employees</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Employees will appear here when sent from n8n
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead._id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.jobTitle}</TableCell>
                  <TableCell>{lead.department}</TableCell>
                  <TableCell>{lead.manager}</TableCell>
                  <TableCell>{lead.startDate}</TableCell>
                  <TableCell>{lead.equipment}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {lead.status || "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
