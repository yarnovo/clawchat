package cmd

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/spf13/cobra"
)

var startCmd = &cobra.Command{
	Use:   "start [container...]",
	Short: "Start stopped containers",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return fmt.Errorf("failed to connect to Docker: %w", err)
		}
		defer cli.Close()

		for _, name := range args {
			if err := cli.ContainerStart(context.Background(), name, container.StartOptions{}); err != nil {
				fmt.Printf("Error starting %s: %v\n", name, err)
				continue
			}
			fmt.Printf("Started: %s\n", name)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(startCmd)
}
