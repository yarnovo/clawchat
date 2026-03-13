package cmd

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/spf13/cobra"
)

var forceRemove bool

var rmCmd = &cobra.Command{
	Use:   "rm [container...]",
	Short: "Remove containers",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return fmt.Errorf("failed to connect to Docker: %w", err)
		}
		defer cli.Close()

		for _, name := range args {
			if err := cli.ContainerRemove(context.Background(), name, container.RemoveOptions{
				Force: forceRemove,
			}); err != nil {
				fmt.Printf("Error removing %s: %v\n", name, err)
				continue
			}
			fmt.Printf("Removed: %s\n", name)
		}
		return nil
	},
}

func init() {
	rmCmd.Flags().BoolVarP(&forceRemove, "force", "f", false, "Force remove running container")
	rootCmd.AddCommand(rmCmd)
}
