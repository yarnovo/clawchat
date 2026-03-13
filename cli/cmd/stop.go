package cmd

import (
	"context"
	"fmt"

	"github.com/docker/docker/client"
	"github.com/docker/docker/api/types/container"
	"github.com/spf13/cobra"
)

var stopCmd = &cobra.Command{
	Use:   "stop [container...]",
	Short: "Stop running containers",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return fmt.Errorf("failed to connect to Docker: %w", err)
		}
		defer cli.Close()

		for _, name := range args {
			if err := cli.ContainerStop(context.Background(), name, container.StopOptions{}); err != nil {
				fmt.Printf("Error stopping %s: %v\n", name, err)
				continue
			}
			fmt.Printf("Stopped: %s\n", name)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(stopCmd)
}
