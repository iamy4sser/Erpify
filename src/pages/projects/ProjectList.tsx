import React from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Briefcase,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  X,
  Check,
  FileText,
} from "lucide-react";
import axios from "axios";
import type { Project } from "../../types/projects";
import type { Contact } from "../../types/crm";

const statusColors = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  "on-hold": "bg-yellow-100 text-yellow-800",
};

const statusLabels = {
  active: "En cours",
  completed: "Terminé",
  "on-hold": "En pause",
};

export default function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(
    null
  );
  const [stats, setStats] = React.useState([
    {
      name: "Projets actifs",
      value: "0",
      change: "+0",
      changeType: "neutral",
      icon: FileText,
    },

    {
      name: "Heures ce mois",
      value: "0",
      change: "+0%",
      changeType: "neutral",
      icon: FileText,
    },

    {
      name: "Membres",
      value: "0",
      change: "+0",
      changeType: "neutral",
      icon: FileText,
    },

    {
      name: "Taux complétion",
      value: "0%",
      change: "+0%",
      changeType: "neutral",
      icon: FileText,
    },
  ]);

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/projects");
        setProjects(response.data);

        // Calcul des statistiques
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Projets actifs
        const activeProjects = response.data.filter(
          (p: Project) => p.status === "active"
        ).length;

        const lastMonthProjects = response.data.filter((p: Project) => {
          const projectDate = new Date(p.startDate);

          return (
            projectDate.getMonth() === currentMonth - 1 &&
            projectDate.getFullYear() === currentYear &&
            p.status === "active"
          );
        }).length;

        const projectChange = activeProjects - lastMonthProjects;

        // Heures travaillées ce mois
        const currentMonthHours = response.data.reduce(
          (sum: number, p: Project) => {
            if (p.status === "active") {
              return sum + p.teamSize * 160; // 160 heures par personne par mois en moyenne
            }

            return sum;
          },
          0
        );

        const lastMonthHours = response.data.reduce(
          (sum: number, p: Project) => {
            const projectDate = new Date(p.startDate);

            if (
              projectDate.getMonth() === currentMonth - 1 &&
              projectDate.getFullYear() === currentYear &&
              p.status === "active"
            ) {
              return sum + p.teamSize * 160;
            }

            return sum;
          },
          0
        );

        const hoursChange =
          lastMonthHours === 0
            ? 100
            : ((currentMonthHours - lastMonthHours) / lastMonthHours) * 100;

        // Nombre total de membres
        const totalMembers = response.data.reduce(
          (sum: number, p: Project) => sum + p.teamSize,
          0
        );

        const lastMonthMembers = response.data.reduce(
          (sum: number, p: Project) => {
            const projectDate = new Date(p.startDate);

            if (
              projectDate.getMonth() === currentMonth - 1 &&
              projectDate.getFullYear() === currentYear
            ) {
              return sum + p.teamSize;
            }

            return sum;
          },
          0
        );

        const membersChange = totalMembers - lastMonthMembers;

        // Taux moyen de complétion
        const avgProgress =
          response.data.reduce(
            (sum: number, p: Project) => sum + p.progress,
            0
          ) / (response.data.length || 1);

        const lastMonthProgress =
          response.data.reduce((sum: number, p: Project) => {
            const projectDate = new Date(p.startDate);

            if (
              projectDate.getMonth() === currentMonth - 1 &&
              projectDate.getFullYear() === currentYear
            ) {
              return sum + p.progress;
            }

            return sum;
          }, 0) / (response.data.length || 1);

        const progressChange =
          lastMonthProgress === 0
            ? 0
            : ((avgProgress - lastMonthProgress) / lastMonthProgress) * 100;

        setStats([
          {
            name: "Projets actifs",
            value: activeProjects.toString(),
            change:
              projectChange >= 0
                ? `+${projectChange}`
                : projectChange.toString(),
            changeType: projectChange >= 0 ? "positive" : "negative",
            icon: FileText,
          },

          {
            name: "Heures ce mois",
            value: currentMonthHours.toString(),
            change: `${hoursChange >= 0 ? "+" : ""}${hoursChange.toFixed(1)}%`,
            changeType: hoursChange >= 0 ? "positive" : "negative",
            icon: FileText,
          },

          {
            name: "Membres",
            value: totalMembers.toString(),
            change:
              membersChange >= 0
                ? `+${membersChange}`
                : membersChange.toString(),
            changeType: membersChange >= 0 ? "positive" : "negative",
            icon: FileText,
          },

          {
            name: "Taux complétion",
            value: `${avgProgress.toFixed(0)}%`,
            change: `${progressChange >= 0 ? "+" : ""}${progressChange.toFixed(
              1
            )}%`,
            changeType: progressChange >= 0 ? "positive" : "negative",
            icon: FileText,
          },
        ]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError("Une erreur est survenue lors du chargement des projets");
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getClientName = (project: Project) => {
    return project.client
      ? `${project.client.name} (${project.client.company})`
      : "Unknown Client";
  };

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" || project.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, selectedStatus]);

  const handleSaveProject = async (project: Project) => {
    try {
      await axios.put(
        `http://localhost:3000/api/projects/${project.id}`,
        project
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? project : p))
      );
      setEditingProjectId(null);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Une erreur est survenue lors de la mise à jour du projet");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/projects/${projectId}`);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Une erreur est survenue lors de la suppression du projet");
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
  };

  const handleStatusChange = async (
    projectId: string,
    newStatus: Project["status"]
  ) => {
    try {
      await axios.put(`http://localhost:3000/api/projects/${projectId}`, {
        status: newStatus,
      });
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, status: newStatus } : project
        )
      );
      setEditingProjectId(null);
    } catch (error) {
      console.error("Error updating project status:", error);
      alert(
        "Une erreur est survenue lors de la mise à jour du statut du projet"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">
            Chargement des projets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Projets</h1>
        <p className="mt-2 text-sm text-gray-700">
          Gérez vos projets et suivez leur avancement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-gray-50 p-3">
                <stat.icon
                  className="h-6 w-6 text-gray-600"
                  aria-hidden="true"
                />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === "positive"
                    ? "text-green-600"
                    : stat.changeType === "negative"
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Projets en cours
          </h2>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau projet
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un projet..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <select
                className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">En cours</option>
                <option value="completed">Terminés</option>
                <option value="on-hold">En pause</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {editingProjectId === project.id ? (
                <>
                  <div className="flex items-start justify-between border-b border-gray-200 p-6">
                    <div>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          value={project.name}
                          onChange={(e) =>
                            setProjects((prev) =>
                              prev.map((p) =>
                                p.id === project.id
                                  ? { ...p, name: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        <input
                          type="text"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          value={project.description}
                          onChange={(e) =>
                            setProjects((prev) =>
                              prev.map((p) =>
                                p.id === project.id
                                  ? { ...p, description: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-green-600 hover:text-green-900"
                        onClick={() => handleSaveProject(project)}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => handleCancelEdit()}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Client
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-medium text-gray-900">
                            {getClientName(project)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Équipe
                        </div>
                        <div className="mt-1">
                          <input
                            type="number"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={project.teamSize}
                            onChange={(e) =>
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? { ...p, teamSize: Number(e.target.value) }
                                    : p
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Spent
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <input
                            type="number"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={project.spent}
                            onChange={(e) =>
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? { ...p, spent: Number(e.target.value) }
                                    : p
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Dates
                        </div>
                        <div className="mt-1 text-sm text-gray-900">
                          <input
                            type="date"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={project.startDate}
                            onChange={(e) =>
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? { ...p, startDate: e.target.value }
                                    : p
                                )
                              )
                            }
                          />
                          <input
                            type="date"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={project.endDate}
                            onChange={(e) =>
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? { ...p, endDate: e.target.value }
                                    : p
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Status
                        </div>
                        <select
                          className="rounded-lg border-gray-300 py-2"
                          value={project.status}
                          onChange={(e) =>
                            handleStatusChange(
                              project.id,
                              e.target.value as
                                | "active"
                                | "completed"
                                | "on-hold"
                            )
                          }
                        >
                          <option value="active">En cours</option>
                          <option value="completed">Terminé</option>
                          <option value="on-hold">En pause</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium text-gray-900">
                          Progression
                        </div>
                        <div className="font-medium text-primary-600">
                          {project.progress}%
                        </div>
                      </div>
                      <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
                        <input
                          type="range"
                          className="h-2 rounded-full bg-primary-600"
                          value={project.progress}
                          onChange={(e) =>
                            setProjects((prev) =>
                              prev.map((p) =>
                                p.id === project.id
                                  ? { ...p, progress: Number(e.target.value) }
                                  : p
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between border-b border-gray-200 p-6">
                    <div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {project.name}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[project.status]
                          }`}
                        >
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {project.description}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-gray-400 hover:text-blue-500"
                        onClick={() => setEditingProjectId(project.id)}
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Client
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-medium text-gray-900">
                            {getClientName(project)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Équipe
                        </div>
                        <div className="mt-1">
                          <div className="text-sm text-gray-900">
                            {project.teamSize} membres
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Budget
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {project.spent.toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            /{" "}
                            {project.budget.toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Dates
                        </div>
                        <div className="mt-1 text-sm text-gray-900">
                          {new Date(project.startDate).toLocaleDateString(
                            "fr-FR"
                          )}{" "}
                          -{" "}
                          {new Date(project.endDate).toLocaleDateString(
                            "fr-FR"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium text-gray-900">
                          Progression
                        </div>
                        <div className="font-medium text-primary-600">
                          {project.progress}%
                        </div>
                      </div>
                      <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-primary-600"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
