package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/spf13/cobra"
)

var allContainers bool

var psCmd = &cobra.Command{
	Use:   "ps",
	Short: "List containers",
	RunE: func(cmd *cobra.Command, args []string) error {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return fmt.Errorf("failed to connect to Docker: %w", err)
		}
		defer cli.Close()

		containers, err := cli.ContainerList(context.Background(), container.ListOptions{
			All: allContainers,
		})
		if err != nil {
			return fmt.Errorf("failed to list containers: %w", err)
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "CONTAINER ID\tIMAGE\tSTATUS\tNAMES")
		for _, c := range containers {
			id := c.ID[:12]
			name := ""
			if len(c.Names) > 0 {
				name = c.Names[0][1:] // remove leading /
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", id, c.Image, c.Status, name)
		}
		w.Flush()
		return nil
	},
}

func init() {
	psCmd.Flags().BoolVarP(&allContainers, "all", "a", false, "Show all containers (default shows just running)")
	rootCmd.AddCommand(psCmd)
}
